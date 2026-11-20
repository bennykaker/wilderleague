import {test} from 'node:test'
import {starterCatalogue} from '../lib/tester/starter-catalogue'
import {eligibleForReboot} from '../lib/tester/reboot'
import life from '../lib/tester/life-status.json'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {literaryChallenge,literaryTitles,mergeLibrary} from '../lib/tester/books'
import {createTesterApi} from '../lib/tester/api'
import {TesterStore} from '../lib/tester/store'
import type {Catalogue,Challenge} from '../lib/tester/model'
import {receiveContribution} from '../lib/tester/contributions'
import {castImage} from '../lib/tester/exports'
import {selectedLiteraryRoles} from '../lib/tester/library-client'
import characterDescriptions from '../data/book-casting/character-descriptions.json'

const resolve = async(slug:string) => {
 const roster=literaryChallenge(slug)
 if(!roster) throw new Error('Unknown title')
 return roster
}

test('every curated book and universe opens with unique castable roles and stable identifiers',()=>{
 const books=literaryTitles.filter(t=>t.type==='book')
 assert.equal(books.length,420)
 assert.equal(new Set(books.map(t=>t.title.toLowerCase())).size,420)
 assert.equal(new Set(literaryTitles.map(t=>t.slug)).size,literaryTitles.length)
 for(const title of literaryTitles) {
   assert.match(title.slug,/^[a-z0-9-]{1,150}$/)
   const roster=literaryChallenge(title.slug)!
   assert.equal(roster.roles.length,title.roleCount)
   assert.ok(roster.roles.length>=3)
   assert.equal(new Set(roster.roles.map(r=>r.id)).size,roster.roles.length,title.title)
   assert.ok(roster.roles.every(r=>r.id.length>10&&r.name.trim()))
   if(title.type==='book')assert.ok(new URL(roster.source).protocol==='https:')
   if(title.type==='universe') {
     const union=new Set(roster.literary!.books!.flatMap(b=>literaryChallenge(b.slug)!.roles.map(r=>r.name)))
     assert.deepEqual(union,new Set(roster.roles.map(r=>r.name)))
   }
 }
 const merged=mergeLibrary([{slug:'old',title:'Fourth Wing',type:'book',year:null},{slug:'dune-film',title:'Dune',type:'movie',year:2021}])
 assert.ok(merged.some(t=>t.slug==='dune-film'));assert.ok(!merged.some(t=>t.slug==='old'))
})

test('shared-world rosters cover the specified books without repeating returning characters',()=>{
 for(const [slug,n,name] of [['discworld',41,'Sam Vimes'],['harry-potter',7,'Harry Potter'],['middle-earth',6,'Gandalf']] as const) {
   const universe=literaryChallenge('universe-'+slug)!
   assert.equal(universe.literary?.books?.length,n)
   assert.equal(universe.roles.filter(role=>role.name===name).length,1)
   assert.ok(universe.roles.length>100)
 }
})

test('book descriptions cover each selected roster and follow the character into the right book', () => {
 const entries = Object.entries(characterDescriptions)
 assert.ok(entries.length >= 200)
 for (const [slug, descriptions] of entries) {
   const book = literaryChallenge(slug)
   assert.equal(book?.literary?.kind, 'book', slug)
   assert.deepEqual(Object.fromEntries(book!.roles.map(role => [role.name, role.description])), descriptions, slug)
   assert.ok(Object.values(descriptions).every(text => text.trim().length > 0), slug)
 }
 const haymitch = (slug:string) => literaryChallenge(slug)!.roles.find(role => role.name === 'Haymitch Abernathy')!.description
 assert.notEqual(haymitch('book-suzanne-collins-the-hunger-games'), haymitch('book-suzanne-collins-sunrise-on-the-reaping'))
})

test('partial literary lineups survive saving, sharing, reopening, retrying and exporting',async()=>{
 const store=new TesterStore(':memory:')
 try {
   const roster=await resolve('universe-discworld')
   const actors=roster.roles.map((_,i)=>({id:'a'+i,name:'Performer '+i,image:'',biography:'',knownFor:'',nationality:''}))
   const catalogue:Catalogue={challenges:[],pools:{},actors}
   const handle=createTesterApi(store,async()=>catalogue,resolve)
   const account=await store.register('reader','a long test password')
   const cookie='wl_tester_session='+store.session(account)
   const post=(action:string,body:unknown)=>handle(new Request('http://release.test/api/preview/'+action,{method:'POST',headers:{origin:'http://release.test',cookie,'content-type':'application/json'},body:JSON.stringify(body)}))
   const input={challengeId:roster.id,picks:['a0'],pitch:'The quiet charisma.',publish:false,roleIds:[roster.roles[20].id]}
   const save=await post('save',input);assert.equal(save.status,200)
   const {cast}=await save.json()
   assert.equal(cast.snapshot.challenge.roles[0].name,roster.roles[20].name)
   assert.equal((await (await post('save',input)).json()).cast.id,cast.id)
   assert.notEqual((await (await post('save',{...input,roleIds:[roster.roles[21].id]})).json()).cast.id,cast.id)
   assert.equal((await handle(new Request('http://release.test/api/preview/cast?id='+cast.id))).status,404)
   assert.equal((await post('publish',{id:cast.id})).status,200)
   const shared=await (await handle(new Request('http://release.test/api/preview/cast?id='+cast.id))).json()
   assert.equal(shared.cast.snapshot.actors[0].id,'a0')
   assert.equal((await post('save',{...input,roleIds:['unknown']})).status,400)
   assert.equal((await post('save',{...input,roleIds:[input.roleIds[0],input.roleIds[0]],picks:['a0','a1']})).status,400)
   const pack=await post('export-analysis',input);assert.equal(pack.status,200);assert.ok((await pack.text()).includes(roster.roles[20].name))
   const jpg=await castImage({challenge:roster,actors,pitch:''})
   assert.equal((await sharp(jpg).metadata()).format,'png')
   const legacy:Challenge={...roster,literary:undefined}
   assert.throws(()=>selectedLiteraryRoles(legacy,input.roleIds))
 } finally {store.close()}
})

test('reader corrections and original artwork reach private review with title context',async()=>{
 const store=new TesterStore(':memory:')
 try {
   const req=(form:FormData,origin='http://release.test')=>new Request('http://release.test/api/preview/contributions',{method:'POST',headers:{origin},body:form})
   const form=new FormData()
   for(const [k,v] of Object.entries({kind:'add',slug:'universe-harry-potter',character:'A missing character',message:'Here is the chapter where they appear.'}))form.set(k,v)
   assert.deepEqual(await receiveContribution(req(form),store,resolve),{ok:true})
   await receiveContribution(req(form),store,resolve)
   assert.equal(store.db.prepare('select count(*) as n from fan_contributions').get()?.n,1)
   form.set('kind','remove');form.set('character','Hermione Granger')
   await receiveContribution(req(form),store,resolve)
   form.set('kind','correct');await receiveContribution(req(form),store,resolve)
   form.set('character','Outside the roster')
   await assert.rejects(receiveContribution(req(form),store,resolve),/Choose a character/)
   form.set('kind','art');form.set('character','Harry Potter');form.set('credit','Test Artist');form.set('email','studio@example.test');form.set('consent','yes')
   form.set('file',new Blob(['broken image'],{type:'image/png'}),'upload.png')
   await assert.rejects(receiveContribution(req(form),store,resolve),/readable image/)
   const bytes=await sharp({create:{width:2,height:2,channels:3,background:'#255944'}}).png().toBuffer()
   form.set('file',new Blob([new Uint8Array(bytes)],{type:'image/png'}),'portrait.png')
   await assert.rejects(receiveContribution(req(form,'http://elsewhere.test'),store,resolve),/Reload/)
   await receiveContribution(req(form),store,resolve)
   const row=store.db.prepare('select details, artwork from fan_contributions where artwork is not null').get()!
   assert.equal(JSON.parse(String(row.details)).title,'Harry Potter')
   assert.deepEqual(Buffer.from(row.artwork as Uint8Array),bytes)
 } finally {store.close()}
})

test('a book can be cast and saved when the general catalogue is unavailable',async()=>{
 const records:Record<string,Parameters<typeof eligibleForReboot>[0]>=life.entries
 for(const actor of starterCatalogue.actors){
  assert.ok(eligibleForReboot(records[actor.id.slice(5)],life.checkedAt),actor.name)
 }
 const store=new TesterStore(':memory:')
 try{
  const unavailable=async():Promise<Catalogue>=>{throw new Error('Unrelated catalogue unavailable')}
  const api=createTesterApi(store,unavailable,resolve,async()=>starterCatalogue)
  const read=await api(new Request('http://release.test/api/preview/actor-directory'))
  assert.equal(read.status,200)
  assert.equal((await read.json()).actors.length,starterCatalogue.actors.length)
  const book=literaryChallenge('book-rebecca-yarros-fourth-wing')!
  const user=await store.register('bookreader','reader password example')
  const response=await api(new Request('http://release.test/api/preview/save',{method:'POST',headers:{
   origin:'http://release.test','content-type':'application/json',cookie:'wl_tester_session='+store.session(user)
  },body:JSON.stringify({challengeId:book.id,picks:[starterCatalogue.actors[0].id],roleIds:[book.roles[0].id],pitch:'',publish:false})}))
  assert.equal(response.status,200)
  assert.equal((await response.json()).cast.snapshot.challenge.roles[0].name,book.roles[0].name)
 }finally{store.db.close()}
})
