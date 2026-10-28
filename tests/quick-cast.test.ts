import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHALLENGE_ID, STORAGE_KEY, decodeCast, encodeCast, validPicks, type Actor, type Picks } from '../lib/quick-cast/model'
const actors:Actor[]=['1','2','3','4'].map(id=>({id:`tmdb:${id}`,name:`Actor ${id}`,image:'',knownFor:''}))
const picks:Picks=['tmdb:1','tmdb:2','tmdb:3']
test('a complete cast round-trips through a share URL',()=>{
 const url=new URL('https://preview.example/quick-cast');url.searchParams.set('cast',encodeCast(picks))
 assert.deepEqual(decodeCast(url.searchParams.get('cast')!,actors),picks)
})
test('incomplete casts are valid drafts but invalid shares',()=>{
 assert.equal(validPicks(['tmdb:1',null,null],actors),true)
 assert.equal(decodeCast('["tmdb:1",null,null]',actors),null)
})
test('one actor cannot occupy two roles',()=>assert.equal(validPicks(['tmdb:1','tmdb:1','tmdb:2'],actors),false))
test('actors outside the challenge cannot be restored',()=>assert.equal(decodeCast('["tmdb:1","tmdb:2","tmdb:999"]',actors),null))
test('malformed and oversized links are rejected',()=>{
 for(const raw of ['undefined','{}','[]','null','"cast"','x'.repeat(2001)]) assert.equal(decodeCast(raw,actors),null)
})
test('the draft namespace separates quick challenge casts from regular casts',()=>{
 assert.ok(STORAGE_KEY.includes(CHALLENGE_ID));assert.notEqual(STORAGE_KEY,'wl_cast_breaking-bad')
})
test('changing one actor preserves the other two selections',()=>{
 const changed=[...picks] as Picks;changed[0]='tmdb:4'
 assert.deepEqual(decodeCast(encodeCast(changed),actors),['tmdb:4','tmdb:2','tmdb:3'])
 assert.deepEqual(picks,['tmdb:1','tmdb:2','tmdb:3'])
})
