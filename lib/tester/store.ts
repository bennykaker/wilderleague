import {DatabaseSync} from 'node:sqlite'
import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import type {CastRecord,CastSnapshot,User} from './model'
const scrypt=promisify(scryptCallback)
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
export class StoreError extends Error{constructor(message:string,public status=400){super(message)}}
export class TesterStore{
 db:DatabaseSync
 constructor(file:string){
  if(file!==':memory:')mkdirSync(path.dirname(file),{recursive:true,mode:0o700})
  this.db=new DatabaseSync(file)
  this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL,username_key TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS casts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),challenge_id TEXT NOT NULL,snapshot TEXT NOT NULL,fingerprint TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,UNIQUE(user_id,challenge_id,fingerprint));
  CREATE TABLE IF NOT EXISTS votes(user_id TEXT NOT NULL REFERENCES users(id),cast_id TEXT NOT NULL REFERENCES casts(id),category TEXT CHECK(category IN ('best','hear')) NOT NULL,PRIMARY KEY(user_id,cast_id,category));
  CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS cast_challenge ON casts(challenge_id,published);`)
 }
 limit(key:string,max:number,ms:number){
  const now=Date.now(),k=hash(key)
  this.db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<=? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END').run(k,now+ms,now,now)
  const row=this.db.prepare('SELECT count FROM limits WHERE key=?').get(k)!
  if(Number(row.count)>max)throw new StoreError('Too many attempts. Please try again later.',429)
 }
 async register(username:unknown,password:unknown):Promise<User>{
  if(typeof username!=='string'||! /^[A-Za-z0-9_]{3,24}$/.test(username))throw new StoreError('Use 3–24 letters, numbers or underscores for your username.')
  if(typeof password!=='string'||password.length<12||password.length>128)throw new StoreError('Use a password of 12–128 characters.')
  const id=randomUUID(),salt=randomBytes(16).toString('hex'),derived=await scrypt(password,salt,64) as Buffer
  try{this.db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,username,username.toLowerCase(),salt,derived.toString('hex'))}
  catch(e){if(String(e).includes('UNIQUE'))throw new StoreError('That username is already taken.',409);throw e}
  return{id,username}
 }
 async login(username:unknown,password:unknown):Promise<User>{
  if(typeof username!=='string'||typeof password!=='string'||password.length>128)throw new StoreError('Invalid username or password.',401)
  const row=this.db.prepare('SELECT * FROM users WHERE username_key=?').get(username.toLowerCase())
  const derived=await scrypt(password,String(row?.salt||'00000000000000000000000000000000'),64) as Buffer
  if(!row||!timingSafeEqual(derived,Buffer.from(String(row.password_hash),'hex')))throw new StoreError('Invalid username or password.',401)
  return{id:String(row.id),username:String(row.username)}
 }
 session(user:User){const token=randomBytes(32).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+14*86400000);return token}
 user(token:string|undefined):User|null{if(!token)return null;const row=this.db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires>?').get(hash(token),Date.now());return row?{id:String(row.id),username:String(row.username)}:null}
 logout(token:string|undefined){if(token)this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token))}
 save(user:User,snapshot:CastSnapshot,publish:boolean){
  const fingerprint=hash(JSON.stringify({actors:snapshot.actors.map(a=>a.id),pitch:snapshot.pitch,...(snapshot.challenge.id==='custom'?{custom:snapshot.challenge}: {})})),id=randomUUID()
  this.db.prepare('INSERT INTO casts VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,challenge_id,fingerprint) DO UPDATE SET published=MAX(published,excluded.published)').run(id,user.id,snapshot.challenge.id,JSON.stringify(snapshot),fingerprint,publish?1:0,new Date().toISOString())
  const row=this.db.prepare('SELECT id FROM casts WHERE user_id=? AND challenge_id=? AND fingerprint=?').get(user.id,snapshot.challenge.id,fingerprint)!
  return this.cast(String(row.id),user.id)!
 }
 private rows(where:string,args:(string|number)[],viewer=''):CastRecord[]{
  return this.db.prepare(`SELECT c.*,u.username,
  (SELECT COUNT(*) FROM votes v WHERE v.cast_id=c.id AND v.category='best') AS best,
  (SELECT COUNT(*) FROM votes v WHERE v.cast_id=c.id AND v.category='hear') AS hear,
  EXISTS(SELECT 1 FROM votes v WHERE v.cast_id=c.id AND v.category='best' AND v.user_id=?) AS my_best,
  EXISTS(SELECT 1 FROM votes v WHERE v.cast_id=c.id AND v.category='hear' AND v.user_id=?) AS my_hear
  FROM casts c JOIN users u ON u.id=c.user_id WHERE ${where}`).all(viewer,viewer,...args).map(r=>({id:String(r.id),ownerId:String(r.user_id),username:String(r.username),challengeId:String(r.challenge_id),snapshot:JSON.parse(String(r.snapshot)),published:!!r.published,createdAt:String(r.created_at),best:Number(r.best),hear:Number(r.hear),myBest:!!r.my_best,myHear:!!r.my_hear}))
 }
 cast(id:string,viewer=''){return this.rows('c.id=? AND (c.published=1 OR c.user_id=?)',[id,viewer],viewer)[0]||null}
 mine(user:User){return this.rows('c.user_id=? ORDER BY c.created_at DESC LIMIT 100',[user.id],user.id)}
 board(challengeId:string,category:'best'|'hear',viewer=''){return this.rows(`c.challenge_id=? AND c.published=1 ORDER BY ${category} DESC,c.created_at ASC,c.id ASC LIMIT 50`,[challengeId],viewer)}
 publish(user:User,id:string){const r=this.db.prepare('UPDATE casts SET published=1 WHERE id=? AND user_id=?').run(id,user.id);if(!r.changes)throw new StoreError('Cast not found.',404);return this.cast(id,user.id)}
 vote(user:User,id:string,category:'best'|'hear',enabled:boolean){
  const c=this.cast(id,user.id);if(!c?.published)throw new StoreError('Cast not found.',404)
  if(c.ownerId===user.id)throw new StoreError('You cannot vote for your own cast.')
  if(enabled)this.db.prepare('INSERT OR IGNORE INTO votes VALUES(?,?,?)').run(user.id,id,category)
  else this.db.prepare('DELETE FROM votes WHERE user_id=? AND cast_id=? AND category=?').run(user.id,id,category)
  return this.cast(id,user.id)
 }
 close(){this.db.close()}
}
let instance:TesterStore|undefined
export function getTesterStore(){
 if(process.env.WILDERLEAGUE_PREVIEW!=='1')throw new StoreError('Tester accounts are disabled outside preview mode.',403)
 if(!instance)instance=new TesterStore(path.join(process.cwd(),'.preview-data','tester.sqlite'))
 return instance
}
