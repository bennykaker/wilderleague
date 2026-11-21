import {houseId,weeklySource} from './board-programme'
import {houseCastId} from './house-cast-id'
import type {Challenge} from './model'
import type {BoardCategory,Vote} from './leaderboard'
import {isValidNewPassword,MAX_PASSWORD_LENGTH,passwordLengthMessage} from './password'
import {createServiceClient} from '../supabase/service'
import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {StoreError} from './store'
import type {CastRecord,CastSnapshot,User} from './model'
const scrypt=promisify(scryptCallback),hash=(s:string)=>createHash('sha256').update(s).digest('hex')
export class HostedStore{
 readonly hosted=true
 client=createServiceClient()
 async rpc(action:string,payload:Record<string,unknown>={}){const {data,error}=await this.client.rpc('wl_beta_action',{action,payload});if(error){const msg=error.message;if(msg.startsWith('WL:'))throw new StoreError(msg.slice(3),/limit|Too many/.test(msg)?429:400);throw new Error('Hosted database operation failed: '+error.code)}return data}
 async limit(key:string,max:number,ms:number){await this.rpc('limit',{key:hash(key),max,ms})}
 async register(username:unknown,password:unknown):Promise<User>{
  if(typeof username!=='string'||! /^[A-Za-z0-9_]{3,24}$/.test(username))throw new StoreError('Use 3–24 letters, numbers or underscores for your username.')
  if(!isValidNewPassword(password))throw new StoreError(passwordLengthMessage)
  const id=randomUUID(),salt=randomBytes(16).toString('hex'),derived=await scrypt(password,salt,64) as Buffer
  await this.rpc('register',{id,username,salt,password_hash:derived.toString('hex')});return {id,username}
 }
 async login(username:unknown,password:unknown):Promise<User>{
  if(typeof username!=='string'||typeof password!=='string'||password.length>MAX_PASSWORD_LENGTH)throw new StoreError('Invalid username or password.',401)
  const row=await this.rpc('login-record',{username:username.toLowerCase()}),derived=await scrypt(password,String(row?.salt||'00000000000000000000000000000000'),64) as Buffer
  if(!row||!timingSafeEqual(derived,Buffer.from(row.password_hash,'hex')))throw new StoreError('Invalid username or password.',401)
  return{id:row.id,username:row.username}
 }
 async session(user:User){const token=randomBytes(32).toString('hex');await this.rpc('session',{token:hash(token),user:user.id});return token}
 async user(token:string|undefined):Promise<User|null>{return token?await this.rpc('user',{token:hash(token)}):null}
 async logout(token:string|undefined){if(token)await this.rpc('logout',{token:hash(token)})}
 async save(user:User,snapshot:CastSnapshot,publish:boolean):Promise<CastRecord>{const fingerprint=hash(JSON.stringify({actors:snapshot.actors.map(a=>a.id),...(snapshot.challenge.literary?{roles:snapshot.challenge.roles.map(r=>r.id)}:{}),pitch:snapshot.pitch,...(snapshot.challenge.id==='custom'?{custom:snapshot.challenge}: {})}));const id=await this.rpc('save',{id:randomUUID(),user:user.id,challenge:snapshot.challenge.id,snapshot,fingerprint,publish});return (await this.cast(id,user.id))!}
 async cast(id:string,viewer=''):Promise<CastRecord|null>{return await this.rpc('cast',{id,viewer})}
 async mine(user:User):Promise<CastRecord[]>{return await this.rpc('mine',{viewer:user.id})}
 async board(challengeId:string,category:BoardCategory,viewer=''):Promise<CastRecord[]>{
  const {data,error}=await this.client.rpc('wl_beta_ranked_board',{challenge:challengeId,board_category:category,viewer})
  if(error)throw new StoreError('The leaderboard could not be loaded.',503)
  return data
 }
 async seedWeekly(week:Challenge){
  const slug=weeklySource(week.id)
  if(!slug)return
  const source='stunt:'+slug
  const {data,error}=await this.client.from('wl_beta_casts').select('snapshot,fingerprint')
    .eq('challenge_id',source).eq('user_id',houseId).eq('published',true)
  if(error)throw new StoreError('The weekly starter casts could not be loaded.',503)
  const rows=(data||[]).flatMap(row=>{
    const slot=/^house-v1-([1-5])$/.exec(row.fingerprint)
    const snapshot=row.snapshot as CastSnapshot
    if(!slot||snapshot.challenge.roles.length!==week.roles.length||
      !week.roles.every((role,i)=>role.name===snapshot.challenge.roles[i].name))return []
    return [{id:houseCastId(week.id,Number(slot[1])-1),user_id:houseId,challenge_id:week.id,
      fingerprint:row.fingerprint,snapshot:{...snapshot,challenge:week},published:true}]
  })
  if(!rows.length)return
  const write=await this.client.from('wl_beta_casts').upsert(rows,{onConflict:'id',ignoreDuplicates:true})
  if(write.error)throw new StoreError('The weekly starters could not be published.',503)
 }
 async publish(user:User,id:string){await this.rpc('publish',{user:user.id,id});return await this.cast(id,user.id)}
 async vote(user:User,id:string,category:BoardCategory,value:Vote|boolean){
  const {error}=await this.client.rpc('wl_beta_set_vote',{voter:user.id,entry:id,board_category:category,choice:Number(value)})
  if(error)throw new StoreError(error.message.startsWith('WL:')?error.message.slice(3):'The vote could not be saved.',error.message.startsWith('WL:')?400:503)
  return await this.cast(id,user.id)
 }
}
