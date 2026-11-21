import test from 'node:test'
import assert from 'node:assert/strict'
import {programmeRoster,weeklyReboot,weeklySource,pastReboots,tvStunts} from '../lib/tester/board-programme'
import {hasLeaderboard} from '../lib/tester/leaderboard'
import {withChallenge} from '../lib/tester/library-client'
import {TesterStore} from '../lib/tester/store'
import {createTesterApi} from '../lib/tester/api'
import type {Catalogue} from '../lib/tester/model'

test('the weekly reboot changes on Monday UTC and archived boards keep their original roster',()=>{
  const sunday=new Date('2026-11-22T23:59:59.999Z'),monday=new Date('2026-11-23T00:00:00Z')
  const first=weeklyReboot(sunday),next=weeklyReboot(monday)
  assert.equal(first.title,'Cheers')
  assert.notEqual(next.id,first.id)
  assert.equal(weeklySource(first.id,monday),'cheers')
  assert.deepEqual(programmeRoster(first.id,sunday),programmeRoster(first.id,monday))
  assert.equal(programmeRoster(next.id,sunday),undefined)
  assert.equal(programmeRoster('weekly:2026-11-17',monday),undefined)
  assert.equal(pastReboots(monday)[0].id,first.id)
  assert.ok(hasLeaderboard(programmeRoster(first.id,sunday)))
})
test('ranked TV listings always have identified roles and a restricted pool',()=>{
  assert.equal(new Set(tvStunts.map(s=>s.id)).size,tvStunts.length)
  for(const show of tvStunts){
    const roster=programmeRoster(show.id)!
    assert.ok(roster.roles.length)
    assert.ok(roster.poolSourceId)
    assert.equal(hasLeaderboard(roster),true)
    assert.equal(hasLeaderboard({...roster,id:'free:'+show.id,pool:'all'}),false)
    assert.equal(hasLeaderboard({...roster,id:'free:book',libraryType:'book',pool:'all'}),true)
  }
})
test('stunt board API validates entry eligibility from the source actor pool',async()=>{
  const board=programmeRoster('stunt:cheers')!,store=new TesterStore(':memory:')
  const actors=Array.from({length:board.roles.length+1},(_,i)=>({id:'a'+i,name:'Actor '+i,image:'',knownFor:'',biography:'',nationality:'',gender:''}))
  const picks=actors.slice(0,-1).map(a=>a.id)
  const catalogue:Catalogue={challenges:[],actors,pools:{[board.poolSourceId!]:picks}}
  assert.deepEqual(withChallenge(catalogue,board).pools[board.id],picks)
  try{
    const user=await store.register('editor','test-password'),cookie='wl_tester_session='+store.session(user)
    const handle=createTesterApi(store,async()=>catalogue)
    const save=(ids:string[])=>handle(new Request('http://test/api/preview/save',{method:'POST',headers:{origin:'http://test','content-type':'application/json',cookie},body:JSON.stringify({challengeId:board.id,picks:ids,pitch:'',publish:false})}))
    assert.equal((await save(picks)).status,200)
    assert.equal((await save([...picks.slice(1),actors.at(-1)!.id])).status,400)
    assert.equal((await handle(new Request('http://test/api/preview/board?challenge=stunt%3Acheers&category=best'))).status,200)
  }finally{store.close()}
})
