import {createServiceClient} from '../supabase/service'
import type {Catalogue,Challenge,TesterRole} from './model'
export type LibraryTitle={slug:string;title:string;type:string;year:number|null}
export const featuredSpecs=[
 {id:'snl-brooklyn-99',slug:'brooklyn-nine-nine',pool:'snl',rule:'SNL cast members only.'},
 {id:'snl-good-place',slug:'the-good-place',pool:'snl',rule:'SNL cast members only.'},
 {id:'snl-fellowship',slug:'lotr-fellowship-of-the-ring',pool:'snl',rule:'SNL cast members only.'},
 {id:'lorre-gladiator',slug:'gladiator',pool:'LorreVerse',rule:'Actors tagged in the catalogue’s Chuck Lorre ensemble.'},
 {id:'sorkin-pulp-fiction',slug:'pulp-fiction',pool:'SorkVerse',rule:'Actors tagged in the catalogue’s Aaron Sorkin ensemble.'},
 {id:'gilligan-star-trek',slug:'star-trek-tng',pool:'BreakingBadVerse',rule:'Actors from the catalogue’s Breaking Bad and Better Call Saul ensemble.'},
 {id:'who-star-wars',slug:'star-wars-a-new-hope',pool:'WhoVerse',rule:'Actors tagged in the catalogue’s Doctor Who ensemble.'},
 {id:'whedon-saul',slug:'better-call-saul',pool:'WhedonVerse',rule:'Actors tagged in the catalogue’s Whedon ensemble.'},
 {id:'tolkien-andor',slug:'andor',pool:'TolkienVerse',rule:'Actors tagged in the catalogue’s Tolkien adaptations.'},
]
export async function fetchLibraryTitles():Promise<LibraryTitle[]>{
 const db=createServiceClient(),titles:LibraryTitle[]=[]
 for(let from=0;;from+=1000){const {data,error}=await db.from('titles').select('slug,title,type,year').order('title').range(from,from+999);if(error)throw new Error('Could not load titles.');titles.push(...data);if(data.length<1000)break}
 return titles
}
export async function fetchLibraryChallenge(slug:string):Promise<Challenge>{
 if(!/^[a-z0-9-]{1,150}$/.test(slug))throw new Error('Unknown title.')
 const db=createServiceClient()
 const [title,roles]=await Promise.all([db.from('titles').select('slug,title,type,year').eq('slug',slug).single(),db.from('roles').select('role_name,original_actor,original_actor_image,role_description,display_order').eq('title_slug',slug).order('display_order')])
 if(title.error||roles.error||!roles.data?.length)throw new Error('This title has no casting roles yet. Use “Add your own title” to enter them.')
 const mapped:TesterRole[]=roles.data.slice(0,30).map((r,i)=>({id:'r'+(i+1),name:r.role_name,originalActor:r.original_actor||'',originalImage:r.original_actor_image||'',description:r.role_description||''}))
 return{id:'free:'+slug,title:title.data.title,season:(title.data.type==='book'?'Book · catalogue characters':'Catalogue ensemble')+(roles.data.length>30?' · first 30 roles':''),rule:'Reboot casting with living actors today. All genders welcome for every role. Use each actor once.',pool:'all',source:'',roles:mapped}
}
export {customChallenge,withChallenge} from './library-client'
