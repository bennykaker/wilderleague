import {test} from 'node:test'
import assert from 'node:assert/strict'
import {TesterStore} from '../lib/tester/store'
import {scoreBoardCast} from '../lib/tester/board-judge'
import type {CastSnapshot} from '../lib/tester/model'

const snapshot:CastSnapshot={
  challenge:{id:'featured',title:'Pilot',season:'First',rule:'Reboot',source:'',pool:'all',
    roles:[{id:'one',name:'Lead',description:'Lead performer',originalActor:''}]},
  actors:[{id:'a',name:'Performer',image:'',knownFor:'',biography:'',nationality:''}],pitch:''
}
function setup() {
  const store=new TesterStore(':memory:')
  function account(id:string){
    store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,id,id,'test','test')
    return {id,username:id}
  }
  const owner=account('owner')
  return {store,account,owner,cast:store.save(owner,snapshot,true)}
}
test('approval takes half the score at 21 unique votes in the same category',async()=>{
  const {store,account,cast}=setup()
  try {
    const judge=async()=>({scores:{best:80,hear:65},cost:0.001})
    await scoreBoardCast(store,cast,judge)
    const voters=Array.from({length:21},(_,i)=>account('voter'+i))
    const rating=()=>store.board('featured','best',voters[20].id)[0].rating!
    for(const voter of voters.slice(0,20)) store.vote(voter,cast.id,'best',1)
    store.vote(voters[0],cast.id,'hear',-1)
    assert.equal(rating().score,80)
    store.vote(voters[20],cast.id,'best',-1)
    store.vote(voters[20],cast.id,'best',-1)
    assert.deepEqual(rating(),{up:20,down:1,mine:-1,ai:80,score:(80+100*20/21)/2})
    store.vote(voters[20],cast.id,'best',1)
    assert.equal(rating().score,90)
    store.vote(voters[20],cast.id,'best',0)
    assert.equal(rating().score,80)
    assert.equal(rating().up,20)
    assert.equal(store.board('featured','hear')[0].rating!.score,65)
  } finally {store.close()}
})

test('a saved score is reused across concurrent submissions and both boards',async()=>{
  const {store,cast}=setup()
  try {
    let calls=0
    const judge=async()=>{calls++;return {scores:{best:50,hear:90},cost:0.001}}
    await Promise.all([scoreBoardCast(store,cast,judge),scoreBoardCast(store,cast,judge)])
    assert.equal(await scoreBoardCast(store,cast,judge),'ready')
    assert.equal(calls,1)
    assert.equal(store.board('featured','hear')[0].rating!.score,90)
  }finally{store.close()}
})

test('an unavailable or malformed baseline leaves voting open and does not fabricate a score',async()=>{
  const {store,account,cast}=setup()
  try {
    let calls=0
    const judge=async()=>{calls++;return {scores:{best:-1,hear:40},cost:0.001}}
    assert.equal(await scoreBoardCast(store,cast,judge),'failed')
    assert.equal(await scoreBoardCast(store,cast,judge),'failed')
    assert.equal(calls,1)
    store.vote(account('reader'),cast.id,'best',-1)
    assert.deepEqual(store.board('featured','best')[0].rating,{up:0,down:1,mine:0,ai:null,score:null})
  }finally{store.close()}
})

test('scoring honors the existing shared daily feedback budget',async()=>{
  const {store,cast}=setup()
  try {
    store.db.prepare("INSERT INTO feedback(key,status,created_at,day,reserved,model) VALUES('old','pending',datetime('now'),date('now'),2,'test')").run()
    let called=false
    await assert.rejects(scoreBoardCast(store,cast,async()=>{called=true;throw Error()}),/budget/)
    assert.equal(called,false)
  }finally{store.close()}
})

test('both category boards rank all eligible casts before showing their top 50',async()=>{
  const {store,owner,cast}=setup()
  try {
    for(let i=0;i<51;i++) store.save(owner,{...snapshot,pitch:'Version '+i},true)
    const late=store.save(owner,{...snapshot,pitch:'Latest'},true)
    await scoreBoardCast(store,cast,async()=>({scores:{best:20,hear:95},cost:0}))
    await scoreBoardCast(store,late,async()=>({scores:{best:95,hear:20},cost:0}))
    const best=store.board('featured','best')
    assert.equal(best.length,50)
    assert.deepEqual(best.slice(0,2).map(row=>row.id),[late.id,cast.id])
    assert.deepEqual(store.board('featured','hear').slice(0,2).map(row=>row.id),[cast.id,late.id])
  } finally {store.close()}
})
