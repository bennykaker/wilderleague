import {test} from 'node:test'
import assert from 'node:assert/strict'
import {TesterStore} from '../lib/tester/store'
import {createTesterApi} from '../lib/tester/api'
import {snlMembers} from '../lib/tester/snl-members'
import {challenges} from '../lib/tester/challenges'
import {validateCast,makeSnapshot,isBritish,type Catalogue} from '../lib/tester/model'
import {analysisPack,castImage} from '../lib/tester/exports'
import sharp from 'sharp'
const actors=Array.from({length:14},(_,i)=>({id:'actor'+i,name:'Performer '+i,image:'',knownFor:'Example credit',biography:'',nationality:'British'}))
const catalogue:Catalogue={challenges,actors,pools:Object.fromEntries(challenges.map(c=>[c.id,actors.map(a=>a.id)]))}
const input={challengeId:challenges[0].id,picks:actors.slice(0,3).map(a=>a.id),pitch:'An unexpected ensemble.',publish:false}
test('season rosters and eligibility validation',()=>{
 assert.equal(snlMembers.has('jenna ortega'),false);assert.equal(snlMembers.has('adam sandler'),true)
 assert.deepEqual(challenges.map(c=>c.roles.length),[3,10,12]);assert.equal(isBritish('American, British'),true);assert.equal(isBritish('Irish'),false)
 for(const c of challenges)assert.equal(validateCast({...input,challengeId:c.id,picks:actors.slice(0,c.roles.length).map(a=>a.id)},catalogue).picks.length,c.roles.length)
 for(const picks of [['actor0'],['actor0','actor0','actor1'],['actor0','actor1','outside']])assert.throws(()=>validateCast({...input,picks},catalogue))
})
test('accounts, privacy, idempotent votes, boards and ownership',async()=>{
 const s=new TesterStore(':memory:')
 try{
 const owner=await s.register('tester_one','long test password'),voter=await s.register('tester_two','another long password')
 await assert.rejects(s.register('TESTER_ONE','long test password'));await assert.rejects(s.login('tester_one','wrong'))
 assert.equal((await s.login('TESTER_ONE','long test password')).id,owner.id)
 const token=s.session(owner);assert.equal(s.user(token)?.id,owner.id);s.logout(token);assert.equal(s.user(token),null)
 const snapshot=makeSnapshot(input,catalogue),c=s.save(owner,snapshot,false)
 assert.equal(s.cast(c.id),null);assert.equal(s.cast(c.id,voter.id),null);assert.equal(s.mine(owner).length,1);assert.equal(s.board(input.challengeId,'best').length,0)
 assert.equal(s.save(owner,snapshot,false).id,c.id);assert.throws(()=>s.publish(voter,c.id));s.publish(owner,c.id)
 assert.throws(()=>s.vote(owner,c.id,'best',true));s.vote(voter,c.id,'best',true);s.vote(voter,c.id,'best',true)
 assert.equal(s.cast(c.id)?.best,1);assert.equal(s.cast(c.id)?.hear,0);s.vote(voter,c.id,'hear',true);assert.equal(s.cast(c.id)?.hear,1)
 s.vote(voter,c.id,'best',false);assert.equal(s.cast(c.id)?.best,0)
 const second=s.save(voter,{...snapshot,pitch:'Different'},true);s.vote(owner,second.id,'best',true)
 assert.equal(s.board(input.challengeId,'best')[0].id,second.id);assert.equal(s.board(input.challengeId,'hear')[0].id,c.id)
 assert.equal(s.board(challenges[1].id,'best').length,0)
 }finally{s.close()}
})
test('HTTP API rejects cross-origin writes and preserves account boundaries',async()=>{
 const s=new TesterStore(':memory:'),handle=createTesterApi(s,async()=>catalogue)
 const post=(action:string,body:unknown,cookie='',origin='http://preview.test')=>handle(new Request('http://preview.test/api/preview/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json',cookie},body:JSON.stringify(body)}))
 try{
 assert.equal((await post('register',{username:'tester',password:'long test password'},'','http://evil.test')).status,403)
 assert.equal((await post('save',input)).status,401)
 for(const password of ['short','x'.repeat(129)]) {
  const rejected=await post('register',{username:'tester',password})
  assert.equal(rejected.status,400)
  assert.match((await rejected.json()).error,/6–128 characters/)
 }
 const reg=await post('register',{username:'tester',password:'sitcom'});assert.equal(reg.status,200);assert.match(reg.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict/)
 const cookie=reg.headers.get('set-cookie')!.split(';')[0]
 const saved=await (await post('save',input,cookie)).json();assert.ok(saved.cast.id)
 assert.equal((await handle(new Request('http://preview.test/api/preview/cast?id='+saved.cast.id))).status,404)
 assert.equal((await post('save',{...input,picks:['fake']},cookie)).status,400)
 assert.equal((await post('publish',{id:saved.cast.id},cookie)).status,200)
 assert.equal((await handle(new Request('http://preview.test/api/preview/cast?id='+saved.cast.id))).status,200)
 assert.equal((await post('export-analysis',input)).status,200)
 await post('logout',{},cookie);assert.equal((await post('save',input,cookie)).status,401)
 assert.equal((await post('login',{username:'tester',password:'sitcom'})).status,200)
 }finally{s.close()}
})
test('exports include complete ensemble and render as PNG without actor photos',async()=>{
 for(const c of challenges){const snap=makeSnapshot({...input,challengeId:c.id,picks:actors.slice(0,c.roles.length).map(a=>a.id)},catalogue),pack=analysisPack(snap);for(const r of c.roles)assert.ok(pack.includes(r.name));assert.ok(pack.includes('does not include a RAG index'));const meta=await sharp(await castImage(snap)).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,1080);assert.equal(meta.height,272+Math.ceil(c.roles.length/3)*430)}
})

test('signed-in ballot requests can switch or clear one vote and reject invalid directions',async()=>{
 const store=new TesterStore(':memory:'),handle=createTesterApi(store,async()=>catalogue)
 const post=(body:unknown,cookie='')=>handle(new Request('http://preview.test/api/preview/vote',{
   method:'POST',headers:{origin:'http://preview.test','Content-Type':'application/json',cookie},body:JSON.stringify(body)
 }))
 try {
   const owner=await store.register('director','owner password'),voter=await store.register('reader','reader password')
   const cookie='wl_tester_session='+store.session(voter)
   const cast=store.save(owner,makeSnapshot(input,catalogue),true)
   const ballot={category:'best',id:cast.id}
   assert.equal((await post({...ballot,direction:-1})).status,401)
   assert.equal((await post({...ballot,direction:2},cookie)).status,400)
   assert.equal((await post({...ballot,enabled:true},cookie)).status,200)
   assert.equal((await post({...ballot,direction:-1},cookie)).status,200)
   const url='http://preview.test/api/preview/board?category=best&challenge='+input.challengeId
   const board=await (await handle(new Request(url,{headers:{cookie}}))).json()
   assert.deepEqual(board.casts[0].rating,{ai:null,score:null,up:0,down:1,mine:-1})
   assert.equal((await post({...ballot,direction:0},cookie)).status,200)
   assert.equal(store.board(input.challengeId,'best')[0].rating!.down,0)
 } finally {store.close()}
})
