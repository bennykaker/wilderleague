import lifeStatus from './life-status.json'
import {eligibleForReboot,type LifeRecord} from './reboot'
import {extractDescriptionTags} from './description-search'
import {unstable_cache} from 'next/cache'
import {cache} from 'react'
import {createServiceClient} from '../supabase/service'
import {fetchLibraryTitles,fetchLibraryChallenge,featuredSpecs} from './library'
import {snlMembers} from './snl-members'
import {challenges} from './challenges'
import {isBritish,type Catalogue,type TesterActor} from './model'

export const ACTOR_PAGE_SIZE=250
export type ActorPageEntry={actor:TesterActor;tags:string[]}
export async function fetchActorCount(){
 const {count,error}=await createServiceClient().from('actors').select('name',{count:'exact',head:true})
 if(error||count===null)throw new Error('Could not load the actor catalogue.')
 return count
}
export async function fetchActorPage(page:number):Promise<ActorPageEntry[]>{
 const from=page*ACTOR_PAGE_SIZE
 const {data,error}=await createServiceClient().from('actors')
  .select('name,tmdb_id,headshot_url,known_for,nationality,universe_tags,popularity,race_ethnicity,gender,keywords,casting_profile')
  .order('popularity',{ascending:false,nullsFirst:false}).order('name').order('tmdb_id')
  .range(from,from+ACTOR_PAGE_SIZE-1)
 if(error)throw new Error('Could not load the actor catalogue.')
 // Only the compact display/search fields enter the cache, never full profiles.
 return (data||[]).map(row=>({
  actor:{id:row.tmdb_id?`tmdb:${row.tmdb_id}`:`name:${String(row.name).toLowerCase()}`,name:row.name,image:row.headshot_url||'',knownFor:row.known_for||'',biography:'',nationality:row.nationality||'',ethnicity:row.race_ethnicity||'',gender:row.gender===1?'female':row.gender===2?'male':String(row.gender||'').toLowerCase(),descriptionTags:extractDescriptionTags(row.keywords||'',row.casting_profile||'')},
  tags:String(row.universe_tags||'').split(',').map(s=>s.trim()).filter(Boolean),
 }))
}
async function fetchFeatured(spec:typeof featuredSpecs[number]){
 const base=await fetchLibraryChallenge(spec.slug)
 return {...base,id:spec.id,pool:spec.pool,roles:base.roles.slice(0,8),season:`${Math.min(base.roles.length,8)}-role challenge · catalogue selection`,rule:spec.rule+' Living actors only; any gender for every role. Use each actor once.'}
}
async function fetchOriginalPortraits(){
 const {data,error}=await createServiceClient().from('roles').select('original_actor,original_actor_image').in('title_slug',['breaking-bad','the-west-wing','mad-men'])
 if(error)throw new Error('Could not load original cast portraits.')
 return (data||[]).filter(r=>r.original_actor&&r.original_actor_image)
}
const getOriginalPortraits=unstable_cache(fetchOriginalPortraits,['tester-original-portraits-v1'],{revalidate:3600})
const getActorCount=unstable_cache(fetchActorCount,['tester-actor-count-v1'],{revalidate:3600})
const getActorPage=unstable_cache(fetchActorPage,['tester-actor-page-v1'],{revalidate:3600})
const getTitles=unstable_cache(fetchLibraryTitles,['tester-title-list-v1'],{revalidate:3600})
const getFeatured=unstable_cache(fetchFeatured,['tester-featured-v3'],{revalidate:3600})

async function loadCatalogue(cached:boolean):Promise<Catalogue>{
 const count=await (cached?getActorCount:fetchActorCount)()
 const pages:ActorPageEntry[][]=[]
 // Bounded batches keep a cold cache from flooding the database.
 for(let page=0;page<Math.ceil(count/ACTOR_PAGE_SIZE);page+=4){
  const batch=Array.from({length:Math.min(4,Math.ceil(count/ACTOR_PAGE_SIZE)-page)},(_,i)=>page+i)
  pages.push(...await Promise.all(batch.map(page=>(cached?getActorPage:fetchActorPage)(page))))
 }
 const actors:TesterActor[]=[],snl:string[]=[],british:string[]=[],seen=new Set<string>(),tags:Record<string,string[]>={}
 for(const entry of pages.flat()){
  const actor=entry.actor;if(seen.has(actor.id))continue;seen.add(actor.id)
  const life=(lifeStatus.entries as Record<string,LifeRecord>)[actor.id.replace(/^tmdb:/,'')]
  if(!eligibleForReboot(life,new Date().toISOString().slice(0,10)))continue
  actor.birthYear=Number(life.birth!.slice(0,4))
  actors.push(actor)
  for(const tag of entry.tags)(tags[tag]??=[]).push(actor.id)
  if(snlMembers.has(actor.name.toLowerCase()))snl.push(actor.id)
  if(isBritish(actor.nationality))british.push(actor.id)
 }
 const [titles,featured,portraits]=await Promise.all([(cached?getTitles:fetchLibraryTitles)(),Promise.all(featuredSpecs.map(spec=>(cached?getFeatured:fetchFeatured)(spec))),(cached?getOriginalPortraits:fetchOriginalPortraits)()])
 const all=actors.map(a=>a.id),pools:Record<string,string[]>={}
 for(const c of [...challenges,...featured]){
  pools[c.id]=c.pool==='snl'?snl:c.pool==='british'?british:c.pool==='all'?all:tags[c.pool]||[]
  if(pools[c.id].length<c.roles.length)throw new Error(`Not enough eligible actors for ${c.title}.`)
 }
 const nameKey=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
 const images=new Map(pages.flat().map(({actor:a})=>[nameKey(a.name),a.image]))
 for(const r of portraits)images.set(nameKey(r.original_actor),r.original_actor_image)
 const picturedChallenges=[...challenges,...featured].map(c=>({...c,roles:c.roles.map(r=>({...r,originalImage:r.originalImage||images.get(nameKey(r.originalActor))||''}))}))
 return {actors,challenges:picturedChallenges,pools,titles}
}
// The assembled catalogue may exceed Next's 2 MB per-entry limit. Cache only
// the independent chunks above; React cache deduplicates assembly per render.
export const getTesterCatalogue=cache(()=>loadCatalogue(true))
export const fetchTesterCatalogue=()=>loadCatalogue(false)
