import {test} from 'node:test'
import assert from 'node:assert/strict'
import {challenges} from '../lib/tester/challenges'
import {emptyJourney,recordResult,continueJourney,sampleResult,restoreJourney} from '../lib/tester/journey'
import {customChallenge,withChallenge} from '../lib/tester/library-client'
import {createTesterApi} from '../lib/tester/api'
import {TesterStore} from '../lib/tester/store'
import type {Catalogue} from '../lib/tester/model'
const actors=Array.from({length:15},(_,i)=>({id:'a'+i,name:'Actor '+i,image:'',knownFor:'',biography:'',nationality:'British'}))
const cat:Catalogue={challenges,actors,pools:Object.fromEntries(challenges.map(c=>[c.id,actors.map(a=>a.id)]))}
const input=(i:number)=>({challengeId:challenges[i].id,picks:actors.slice(0,challenges[i].roles.length).map(a=>a.id),pitch:'',publish:false})
test('opening progresses in order, shows each result, then unlocks the library',()=>{
 let j=emptyJourney();assert.equal(continueJourney(j).stage,0)
 assert.throws(()=>recordResult(j,sampleResult(input(1),cat)))
 for(let i=0;i<3;i++){j=recordResult(j,sampleResult(input(i),cat));assert.equal(j.stage,i);assert.equal(j.results[i].score,[82,78,86][i]);j=restoreJourney(JSON.stringify(j),cat);assert.equal(j.stage,i);j=continueJourney(j)}
 assert.equal(j.stage,3);assert.equal(j.results.length,3);assert.deepEqual(restoreJourney(JSON.stringify(j),cat),j)
})
test('sample scores do not pretend to evaluate different actor choices',()=>{
 const first=sampleResult(input(0),cat),other=sampleResult({...input(0),picks:['a4','a5','a6']},cat)
 assert.equal(first.score,other.score);assert.throws(()=>sampleResult({...input(0),picks:['a0']},cat))
})
test('malformed or stale progress cannot skip unfinished challenges',()=>{
 assert.deepEqual(restoreJourney('not json',cat),emptyJourney())
 assert.equal(restoreJourney(JSON.stringify({stage:3,results:[]}),cat).stage,0)
 assert.equal(restoreJourney(JSON.stringify({stage:3,results:[{challengeId:challenges[0].id,picks:['missing'],pitch:''}]}),cat).stage,0)
})
test('custom titles validate characters and remain distinct when saved',async()=>{
 assert.throws(()=>customChallenge({title:'Book',kind:'book',roles:['Hero','hero']}));assert.throws(()=>customChallenge({title:'Book',kind:'book',roles:[]}))
 const s=new TesterStore(':memory:');const user=await s.register('reader','long preview password')
 const resolve=async()=>({...challenges[0],id:'free:example',pool:'all'})
 const handle=createTesterApi(s,async()=>cat,resolve),cookie='wl_tester_session='+s.session(user)
 const post=(body:unknown)=>handle(new Request('http://preview.test/api/preview/save',{method:'POST',headers:{origin:'http://preview.test','Content-Type':'application/json',cookie},body:JSON.stringify(body)}))
 try{const custom={title:'My book',kind:'book',roles:['Hero','Rival']};const c=customChallenge(custom);assert.equal(withChallenge(cat,c).pools.custom.length,actors.length)
 const first=await post({challengeId:'custom',picks:['a0','a1'],pitch:'',publish:false,custom});assert.equal(first.status,200)
 const second=await post({challengeId:'custom',picks:['a0','a1'],pitch:'',publish:false,custom:{...custom,title:'Another book'}});assert.equal(second.status,200)
 assert.equal(s.mine(user).length,2)
 const library=await post({...input(0),challengeId:'free:example'});assert.equal(library.status,200)
 assert.equal((await post({challengeId:'custom',picks:['a0'],pitch:'',publish:false,custom})).status,400)
 }finally{s.close()}
})
