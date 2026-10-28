import {test} from 'node:test'
import assert from 'node:assert/strict'
import {TesterStore} from '../lib/tester/store'
import {aiSearch} from '../lib/tester/ai-search'
const actors=['Nick Offerman','Other Actor'].map((name,i)=>({id:String(i),name,image:'',knownFor:'',biography:'',nationality:''}))
const cat={actors,challenges:[{id:'c',title:'Show',season:'',rule:'',roles:[],source:'',pool:'all'}],pools:{c:['0']}}
test('semantic suggestions cached by normalized phrase and filtered against current eligibility',async()=>{
 process.env.WILDERLEAGUE_PREVIEW='1';const s=new TesterStore(':memory:');let calls=0
 const user=await s.register('search_tester','test password long')
 const provider=async()=>{calls++;return {idea:{interpretation:'Dry, gruff delivery.',suggestions:[{name:'Nick Offerman',reason:'Dry delivery'},{name:'Other Actor',reason:'x'},{name:'Invented Name',reason:'x'}]},cost:0.001}}
 try{const first=await aiSearch(s,cat,'c','Ron Swanson type',user.id,provider);assert.deepEqual(first.matches.map(x=>x.id),['0']);assert.equal(first.cached,false)
 const again=await aiSearch(s,cat,'c','  RON   SWANSON type ',user.id,provider);assert.equal(again.cached,true);assert.equal(calls,1)
 const restricted=await aiSearch(s,{...cat,pools:{c:[]}},'c','Ron Swanson type',user.id,provider);assert.equal(restricted.matches.length,0);assert.equal(calls,1)
 process.env.WILDERLEAGUE_PREVIEW='0';await assert.rejects(aiSearch(s,cat,'c','new query',user.id,provider));assert.equal(calls,1)
 }finally{s.close();process.env.WILDERLEAGUE_PREVIEW='1'}
})
test('concurrent and failed searches do not duplicate paid calls',async()=>{
 const s=new TesterStore(':memory:');let calls=0,release!:()=>void;const wait=new Promise<void>(r=>{release=r})
 const user=await s.register('search_tester','test password long')
 const provider=async()=>{calls++;await wait;throw new Error('failed')}
 try{const first=aiSearch(s,cat,'c','test',user.id,provider);await assert.rejects(aiSearch(s,cat,'c','test',user.id,provider),/already running/);release();await assert.rejects(first);await assert.rejects(aiSearch(s,cat,'c','test',user.id,provider));assert.equal(calls,1)}finally{s.close()}
})
test('five new searches per account, shared cache exempt, failures count, and midnight resets',async()=>{
 process.env.WILDERLEAGUE_PREVIEW='1';const s=new TesterStore(':memory:');let calls=0
 const one=await s.register('search_one','test password long'),two=await s.register('search_two','test password long')
 const provider=async()=>{calls++;return {idea:{interpretation:'A suggestion',suggestions:[]},cost:0.001}}
 try{
  await assert.rejects(aiSearch(s,cat,'c','anon',undefined,provider),/Sign in/);assert.equal(calls,0)
  for(let i=0;i<4;i++)await aiSearch(s,cat,'c','query '+i,one.id,provider)
  await assert.rejects(aiSearch(s,cat,'c','failed fifth',one.id,async()=>{calls++;throw Error('timeout')}))
  await assert.rejects(aiSearch(s,cat,'c','sixth',one.id,provider),/5 new/);assert.equal(calls,5)
  assert.equal((await aiSearch(s,cat,'c','query 0',one.id,provider)).cached,true)
  assert.equal((await aiSearch(s,cat,'c','query 0',undefined,provider)).cached,true)
  await aiSearch(s,cat,'c','query 0',two.id,provider)
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM ai_search_accounts WHERE user_id=?').get(two.id)!.n,0)
  await aiSearch(s,cat,'c','second account',two.id,provider);assert.equal(calls,6)
  s.db.prepare("UPDATE ai_search_accounts SET day='2000-01-01' WHERE user_id=?").run(one.id)
  await aiSearch(s,cat,'c','new day',one.id,provider);assert.equal(calls,7)
 }finally{s.close()}
})
test('concurrent different searches cannot exceed the last account slot',async()=>{
 process.env.WILDERLEAGUE_PREVIEW='1';const s=new TesterStore(':memory:');let calls=0,release!:()=>void
 const u=await s.register('search_race','test password long'),wait=new Promise<void>(r=>{release=r})
 const provider=async()=>{calls++;return {idea:{interpretation:'test',suggestions:[]},cost:0}}
 try{
  for(let i=0;i<4;i++)await aiSearch(s,cat,'c',String(i),u.id,provider)
  const pending=aiSearch(s,cat,'c','fifth',u.id,async()=>{await wait;return provider()})
  await assert.rejects(aiSearch(s,cat,'c','sixth',u.id,provider),/5 new/)
  release();await pending;assert.equal(calls,5)
 }finally{s.close()}
})
