import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {TesterStore} from '../lib/tester/store'
import {feedbackKey,readFeedback,requestFeedback,type FeedbackProvider} from '../lib/tester/feedback'
import type {CastSnapshot} from '../lib/tester/model'
const snapshot:CastSnapshot={challenge:{id:'test',title:'Test show',season:'S1',rule:'Reboot; all genders',source:'',pool:'all',roles:[{id:'r',name:'Lead',description:'A conflicted leader',originalActor:''}]},actors:[{id:'a',name:'Example Actor',image:'',knownFor:'Example film',biography:'',nationality:''}],pitch:'A quiet reading'}
const content={review:'Could work as a restrained story.',promising_choice:{actor:'Example Actor',role:'Lead',reason:'Explore restraint.'},question_to_explore:{actor:'Example Actor',role:'Lead',reason:'Test the conflict.'},evidence_limits:'Limited catalogue evidence.'}
const reply={text:JSON.stringify(content),inputTokens:100,outputTokens:100,complete:true}
test('saved feedback survives restart; same content does not pay twice; changes are separate',async()=>{
 process.env.WILDERLEAGUE_PREVIEW='1';const dir=mkdtempSync(path.join(tmpdir(),'wl-feedback-'));const file=path.join(dir,'db.sqlite');let store=new TesterStore(file),calls=0
 const generate:FeedbackProvider=async()=>{calls++;return reply}
 try{
  assert.equal(readFeedback(store,snapshot).status,'none');assert.equal(calls,0)
  assert.equal((await requestFeedback(store,snapshot,generate)).status,'ready');store.close();store=new TesterStore(file)
  assert.equal((await requestFeedback(store,snapshot,generate)).status,'ready');assert.equal(calls,1)
  assert.equal(readFeedback(store,snapshot).feedback?.review,content.review)
  assert.notEqual(feedbackKey(snapshot),feedbackKey({...snapshot,pitch:'Changed'}))
  await requestFeedback(store,{...snapshot,pitch:'Changed'},generate);assert.equal(calls,2)
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM casts').get()!.n,0)
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM votes').get()!.n,0)
 }finally{store.close();rmSync(dir,{recursive:true,force:true})}
})
test('concurrent requests reserve only one call; failures never silently retry',async()=>{
 process.env.WILDERLEAGUE_PREVIEW='1';const s=new TesterStore(':memory:');let release!:()=>void,calls=0
 const wait=new Promise<void>(r=>{release=r})
 try{
  const pending=requestFeedback(s,snapshot,async()=>{calls++;await wait;return reply})
  assert.equal((await requestFeedback(s,snapshot,async()=>{calls++;return reply})).status,'pending');assert.equal(calls,1)
  release();await pending
  const other={...snapshot,pitch:'Failure'};assert.equal((await requestFeedback(s,other,async()=>{calls++;throw new Error('timeout')})).status,'failed')
  await requestFeedback(s,other,async()=>{calls++;return reply});assert.equal(calls,2)
  const bad={...snapshot,pitch:'Bad output'};assert.equal((await requestFeedback(s,bad,async()=>({...reply,text:JSON.stringify({...content,promising_choice:{actor:'Wrong',role:'Lead',reason:'x'}})}))).status,'failed')
 }finally{s.close()}
})
test('preview guard and daily budget prevent paid requests; cached reviews remain available',async()=>{
 const s=new TesterStore(':memory:');let calls=0;const generate:FeedbackProvider=async()=>{calls++;return reply}
 try{
  process.env.WILDERLEAGUE_PREVIEW='0';await assert.rejects(requestFeedback(s,snapshot,generate));assert.equal(calls,0)
  process.env.WILDERLEAGUE_PREVIEW='1';await requestFeedback(s,snapshot,generate)
  s.db.prepare('UPDATE feedback SET reserved=2').run()
  await assert.rejects(requestFeedback(s,{...snapshot,pitch:'New'},generate),/daily AI budget/)
  assert.equal((await requestFeedback(s,snapshot,generate)).status,'ready');assert.equal(calls,1)
 }finally{s.close();process.env.WILDERLEAGUE_PREVIEW='1'}
})

test('preview API checks browser origin against requested host, not internal localhost URL',async()=>{
 const {createTesterApi}=await import('../lib/tester/api');const s=new TesterStore(':memory:')
 const cat={challenges:[snapshot.challenge],actors:snapshot.actors,pools:{test:['a']}}
 const api=createTesterApi(s,async()=>cat);const body=JSON.stringify({challengeId:'test',picks:['a'],pitch:'',publish:false})
 try{
  const request=(origin:string)=>new Request('http://localhost:4318/api/preview/feedback-status',{method:'POST',headers:{host:'127.0.0.1:4318',origin,'content-type':'application/json'},body})
  assert.equal((await api(request('http://127.0.0.1:4318'))).status,200)
  assert.equal((await api(request('https://another-site.example'))).status,403)
  assert.equal(s.db.prepare('SELECT count(*) AS n FROM feedback').get()!.n,0)
 }finally{s.close()}
})
