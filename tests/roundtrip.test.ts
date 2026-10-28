import {test} from 'node:test'
import assert from 'node:assert/strict'
import {castReference,returnTemplate,parseReturn,applyReturn} from '../lib/tester/roundtrip'
import {analysisPack} from '../lib/tester/exports'
import type {CastSnapshot,Catalogue} from '../lib/tester/model'
const actors=['One','Two','Three'].map((name,i)=>({id:String(i),name,image:'',knownFor:'Credit',nationality:'',biography:''}))
const challenge={id:'c',title:'Show',season:'Season 1',rule:'Living actors, any gender',roles:[{id:'r1',name:'Lead',description:'Lead role',originalActor:''},{id:'r2',name:'Partner',description:'Partner role',originalActor:''}],pool:'all',source:''}
const cat:Catalogue={actors,challenges:[challenge],pools:{c:['0','1','2']}},s:CastSnapshot={challenge,actors:actors.slice(0,2),pitch:'My rationale'}
const change=(roleId='r1',originalActorId='0',proposedActorName='Three',proposedActorId:string|null=null)=>({roleId,originalActorId,proposedActorName,proposedActorId,reason:'A different reading'})
function raw(changes=[change()]){return JSON.stringify({...returnTemplate(s),changes})}
test('export has exact round-trip identity and imports fenced response without trusting scores',()=>{
 const pack=analysisPack(s);assert.ok(pack.includes('BRING YOUR RESPONSE BACK'));assert.ok(pack.includes(castReference(s)))
 const r=parseReturn('```json\n'+raw()+'\n```',s,cat);assert.equal(r.changes[0].matchedId,'2')
 assert.deepEqual(applyReturn(s,r,{},cat),['0','1']);assert.deepEqual(applyReturn(s,r,{r1:'2'},cat),['2','1'])
 assert.deepEqual(s.actors.map(a=>a.id),['0','1'])
 const extra=JSON.parse(raw());extra.score=100;assert.equal('score' in parseReturn(JSON.stringify(extra),s,cat),false)
})
test('rejects wrong or stale casts, malformed input, excessive input and repeated roles',()=>{
 assert.throws(()=>parseReturn('no json',s,cat));assert.throws(()=>parseReturn('x'.repeat(100001),s,cat))
 assert.throws(()=>parseReturn(raw(),{...s,pitch:'Different'},cat),/different version/)
 assert.throws(()=>parseReturn(raw([change('wrong')]),s,cat),/incorrect role/)
 assert.throws(()=>parseReturn(raw([change(),change()]),s,cat),/different valid role/)
 const r=parseReturn(raw(),s,cat);assert.throws(()=>applyReturn({...s,pitch:'Edited'},r,{r1:'2'},cat),/cast changed/)
})
test('unknown, mismatched and ineligible actors require manual resolution; swaps are atomic',()=>{
 for(const proposal of [change('r1','0','Unknown'),change('r1','0','Three','1')])assert.equal(parseReturn(raw([proposal]),s,cat).changes[0].matchedId,null)
 const restricted={...cat,pools:{c:['0','1']}};const r=parseReturn(raw(),s,restricted);assert.equal(r.changes[0].matchedId,null);assert.throws(()=>applyReturn(s,r,{r1:'2'},restricted),/eligible/)
 const swap=parseReturn(raw([change('r1','0','Two','1'),change('r2','1','One','0')]),s,cat)
 assert.throws(()=>applyReturn(s,swap,{r1:'1'},cat),/twice/)
 assert.deepEqual(applyReturn(s,swap,{r1:'1',r2:'0'},cat),['1','0'])
})
