import {HostedStore} from './hosted-store'
import {StoreError} from './store'
import {feedbackKey,feedbackInput,provider,type Feedback} from './feedback'
import type {SearchProvider} from './ai-search'
import type {CastSnapshot,Catalogue} from './model'
import {createHash} from 'node:crypto'
const allowed=()=>{if(process.env.WILDERLEAGUE_PUBLIC!=='1')throw new StoreError('Public AI is disabled.',403)}
const state=(r:any)=>r?{status:r.status,createdAt:r.created_at,model:r.model,feedback:r.result}:{status:'none'}
export async function readHostedFeedback(store:HostedStore,s:CastSnapshot){return state(await store.rpc('ai-read',{key:'feedback:'+feedbackKey(s)}))}
export async function hostedFeedback(store:HostedStore,s:CastSnapshot,userId?:string){
 allowed();const key='feedback:'+feedbackKey(s),old=await store.rpc('ai-read',{key});if(old)return state(old)
 if(!userId)throw new StoreError('Sign in to request new casting feedback. Saved feedback is still available.',401)
 if(!process.env.ANTHROPIC_API_KEY)throw new StoreError('AI feedback is not configured.',503)
 const input=feedbackInput(s),reserved=(Buffer.byteLength(input)+10000)*3/1e6+0.015
 const claim=await store.rpc('ai-reserve',{key,kind:'feedback',user:userId,reserved,model:'claude-sonnet-4-6'});if(!claim.claimed)return state(claim.row)
 let cost:number|null=null
 try{const r=await provider(input);cost=(r.inputTokens*3+r.outputTokens*15)/1e6;const f=JSON.parse(r.text) as Feedback
  if(!r.complete||Object.keys(f).sort().join()!==['review','promising_choice','question_to_explore','evidence_limits'].sort().join())throw Error('Invalid output')
  for(const k of ['review','evidence_limits'] as const)if(typeof f[k]!=='string'||!f[k].trim()||f[k].length>2500)throw Error('Invalid text')
  for(const k of ['promising_choice','question_to_explore'] as const){const c=f[k];if(!c||typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>1500||!s.actors.some((a,i)=>a.name===c.actor&&s.challenge.roles[i].name===c.role))throw Error('Invalid choice')}
  await store.rpc('ai-finish',{key,status:'ready',result:f,cost})
 }catch{await store.rpc('ai-finish',{key,status:'failed',result:null,cost})}
 return readHostedFeedback(store,s)
}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
export async function hostedSearch(store:HostedStore,cat:Catalogue,challengeId:unknown,query:unknown,userId:string|undefined,generate:SearchProvider){
 allowed();if(typeof query!=='string'||!query.trim()||query.length>200)throw new StoreError('Enter a description of up to 200 characters.')
 if(typeof challengeId!=='string'||!cat.challenges.some(c=>c.id===challengeId))throw new StoreError('Unknown challenge.')
 const q=query.trim().replace(/\s+/g,' '),key='search:'+createHash('sha256').update('v1:'+q.toLowerCase()).digest('hex');let row=await store.rpc('ai-read',{key});const cached=!!row
 if(!row){
  if(!userId)throw new StoreError('Sign in to run a new AI search. Saved searches still work.',401)
  if(!process.env.ANTHROPIC_API_KEY)throw new StoreError('AI search is not configured.',503)
  const claim=await store.rpc('ai-reserve',{key,kind:'search',user:userId,reserved:0.02,model:'claude-haiku-4-5-20251001'});row=claim.row
  if(claim.claimed){let cost:number|null=null;try{const r=await generate(q);cost=r.cost;const idea=r.idea;if(typeof idea.interpretation!=='string'||idea.interpretation.length>700||!Array.isArray(idea.suggestions)||idea.suggestions.length>24||idea.suggestions.some(s=>typeof s.name!=='string'||typeof s.reason!=='string'||s.name.length>150||s.reason.length>300))throw Error('Invalid output');await store.rpc('ai-finish',{key,status:'ready',result:idea,cost});row={status:'ready',result:idea}}catch{await store.rpc('ai-finish',{key,status:'failed',result:null,cost});throw new StoreError('AI search could not complete. It will not be charged again automatically.',503)}}
 }
 if(row.status!=='ready')throw new StoreError(row.status==='pending'?'This search is already running. Try again shortly.':'This search could not complete. It will not be charged again automatically.',409)
 const idea=row.result as {interpretation:string;suggestions:{name:string;reason:string}[]},pool=new Set(cat.pools[challengeId]),seen=new Set<string>()
 const matches=idea.suggestions.flatMap(s=>{const a=cat.actors.find(a=>pool.has(a.id)&&normalize(a.name)===normalize(s.name));if(!a||seen.has(a.id))return [];seen.add(a.id);return[{id:a.id,reason:s.reason}]})
 return {interpretation:idea.interpretation,matches,cached}
}
