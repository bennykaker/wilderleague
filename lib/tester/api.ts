import {HostedStore} from './hosted-store'
import {hostedFeedback,readHostedFeedback} from './hosted-ai'
import {aiSearch} from './ai-search'
import {readFeedback,requestFeedback} from './feedback'
import {customChallenge,withChallenge,fetchLibraryChallenge} from './library'
import type {Catalogue} from './model'
import {makeSnapshot,validateCast} from './model'
import {StoreError,type TesterStore} from './store'
import {analysisPack,castImage} from './exports'
const COOKIE='wl_tester_session'
function token(req:Request){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)}
function json(body:unknown,status=200,headers:Record<string,string>={}){return Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}})}
export function createTesterApi(store:TesterStore|HostedStore,catalogue:()=>Promise<Catalogue>,resolveTitle=fetchLibraryChallenge){return async(req:Request)=>{
 try{
  const url=new URL(req.url),action=url.pathname.split('/api/preview/')[1]||'',user=await store.user(token(req))
  const requireUser=()=>{if(!user)throw new StoreError('Sign in to save, submit or vote.',401);return user}
  if(req.method==='GET'){
   if(action==='title'){try{return json({challenge:await resolveTitle(url.searchParams.get('slug')||'')})}catch(e){throw new StoreError((e as Error).message,404)}}
   if(action==='me')return json({user})
   if(action==='catalogue')return json(await catalogue())
   if(action==='mine')return json({casts:await store.mine(requireUser())})
   if(action==='cast'){const cast=await store.cast(url.searchParams.get('id')||'',user?.id);if(!cast)throw new StoreError('Cast not found or not shared.',404);return json({cast})}
   if(action==='board'){
    const cat=await catalogue(),id=url.searchParams.get('challenge')||'',category=url.searchParams.get('category')
    if(!cat.challenges.some(c=>c.id===id)||!['best','hear'].includes(category||''))throw new StoreError('Unknown leaderboard.')
    return json({casts:await store.board(id,category as 'best'|'hear',user?.id)})
   }
   throw new StoreError('Not found.',404)
  }
  if(req.method!=='POST')return json({error:'Method not allowed.'},405)
  if(req.headers.get('origin')!==`${url.protocol}//${req.headers.get('host')||url.host}`)throw new StoreError('Reload this preview page before trying again.',403)
  if(!req.headers.get('content-type')?.includes('application/json'))throw new StoreError('JSON required.',415)
  const raw=await req.text();if(raw.length>20000)throw new StoreError('Request too large.',413)
  let body:Record<string,unknown>;try{body=JSON.parse(raw)}catch{throw new StoreError('Invalid request.')}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new StoreError('Invalid request.')
  // This local preview is not behind a trusted proxy. Ignore caller-supplied IP headers.
  const visitor=store instanceof HostedStore?(req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown'):'local-preview'
  const cookie=(value:string,age:number)=>`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${url.protocol==='https:'?'; Secure':''}`
  if(action==='register'||action==='login'){
   await store.limit('auth:'+visitor,30,15*60000)
   if(action==='register')await store.limit('register:'+visitor,15,3600000)
   else await store.limit('login:'+String(body.username).toLowerCase(),10,15*60000)
   const account=action==='register'?await store.register(body.username,body.password):await store.login(body.username,body.password)
   return json({user:account},200,{'Set-Cookie':cookie(await store.session(account),14*86400)})
  }
  if(action==='logout'){await store.logout(token(req));return json({user:null},200,{'Set-Cookie':cookie('',0)})}
  async function castCatalogue(candidate:Record<string,unknown>=body){
   let cat=await catalogue()
   try{if(candidate.challengeId==='custom')cat=withChallenge(cat,customChallenge(candidate.custom));else if(typeof candidate.challengeId==='string'&&candidate.challengeId.startsWith('free:'))cat=withChallenge(cat,await resolveTitle(candidate.challengeId.slice(5)))}catch(e){throw new StoreError((e as Error).message)}
   return cat
  }
  if(action==='ai-search')return json(await aiSearch(store,await castCatalogue(),body.challengeId,body.query,user?.id))
  if(action==='feedback-status'||action==='feedback'){
   if(process.env.WILDERLEAGUE_PREVIEW!=='1'&&process.env.WILDERLEAGUE_PUBLIC!=='1')throw new StoreError('AI feedback is disabled.',403)
   const cat=await castCatalogue();let input;try{input=validateCast({...body,publish:false},cat)}catch(e){throw new StoreError((e as Error).message)}
   const snapshot=makeSnapshot(input,cat)
   return json(action==='feedback-status'?(store instanceof HostedStore?await readHostedFeedback(store,snapshot):readFeedback(store,snapshot)):await (store instanceof HostedStore?hostedFeedback(store,snapshot,user?.id):requestFeedback(store,snapshot)))
  }
  if(action==='save'){
   const owner=requireUser();await store.limit('save:'+owner.id,30,3600000)
   const cat=await castCatalogue();let input;try{input=validateCast(body,cat)}catch(e){throw new StoreError((e as Error).message)}
   return json({cast:await store.save(owner,makeSnapshot(input,cat),input.publish)})
  }
  if(action==='publish'){
   const owner=requireUser();if(typeof body.id!=='string')throw new StoreError('Invalid cast.')
   const existing=await store.cast(body.id,owner.id);if(!existing||existing.ownerId!==owner.id)throw new StoreError('Cast not found.',404)
   const c=existing.snapshot.challenge,candidate={challengeId:c.id,picks:existing.snapshot.actors.map(a=>a.id),pitch:existing.snapshot.pitch,publish:true,custom:{title:c.title,kind:c.season.split(' ')[1],roles:c.roles.map(r=>r.name)}}
   const cat=await castCatalogue(candidate);try{validateCast(candidate,cat)}catch{throw new StoreError('This saved cast has choices that are no longer eligible. Open it and choose replacements before sharing.')}
   return json({cast:await store.publish(owner,body.id)})
  }
  if(action==='vote'){
   const voter=requireUser();await store.limit('vote:'+voter.id,120,60000)
   if(typeof body.id!=='string'||!['best','hear'].includes(String(body.category))||typeof body.enabled!=='boolean')throw new StoreError('Invalid vote.')
   return json({cast:await store.vote(voter,body.id,body.category as 'best'|'hear',body.enabled)})
  }
  if(action==='export-image'||action==='export-analysis'){
   await store.limit('export:'+(user?.id||visitor),30,600000)
   const cat=await castCatalogue();let input;try{input=validateCast({...body,publish:false},cat)}catch(e){throw new StoreError((e as Error).message)}
   const snapshot=makeSnapshot(input,cat),filename=input.challengeId
   if(action==='export-analysis')return new Response(analysisPack(snapshot),{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="${filename}-analysis.txt"`,'Cache-Control':'no-store'}})
   const png=await castImage(snapshot)
   return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png','Content-Disposition':`attachment; filename="${filename}-cast.png"`,'Cache-Control':'no-store'}})
  }
  throw new StoreError('Not found.',404)
 }catch(error){if(error instanceof StoreError)return json({error:error.message},error.status);console.error('Tester API failed:',error instanceof Error?error.name:'Error');return json({error:'The preview could not complete that request. Please try again.'},500)}
}}
