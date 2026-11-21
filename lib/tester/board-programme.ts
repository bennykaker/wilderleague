import shows from '../../data/tv-stunts.json'
import type {Challenge} from './model'

const pools:Record<string,{name:string;source:string;tag:string}>={
  british:{name:'British actors only',source:'mad-men-british-s1-v1',tag:'british'},
  snl:{name:'Saturday Night Live alumni',source:'breaking-bad-three-v1',tag:'snl'},
  lorre:{name:'Chuck Lorre actors only',source:'mad-men-chuck-lorre',tag:'LorreVerse'},
  sorkin:{name:'Aaron Sorkin actors only',source:'sorkin-pulp-fiction',tag:'SorkVerse'},
}
export const houseId='7df0b47e-190b-4c1c-986a-27b5d41a2646'
const bySlug=new Map(shows.map(show=>[show.slug,show]))
export const tvStunts=shows.map(show=>({id:'stunt:'+show.slug,title:show.title,brief:pools[show.pool].name}))
const openingMonday=Date.UTC(2026,10,16)
const weekMs=7*24*60*60*1000
const rotation=['cheers','the-west-wing','30-rock','mad-men','the-wire','the-good-place','star-trek-tng','the-office']
const weekIndex=(now:Date)=>Math.max(0,Math.floor((now.getTime()-openingMonday)/weekMs))
function edition(index:number){
  const start=new Date(openingMonday+index*weekMs)
  const slug=rotation[index%rotation.length]
  return {id:'weekly:'+start.toISOString().slice(0,10),slug,title:bySlug.get(slug)!.title,
    dates:start.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}
}
export function weeklySource(id:string,now=new Date()){
  if(!programmeRoster(id,now)||!id.startsWith('weekly:'))return
  return edition((Date.parse(id.slice(7)+'T00:00:00Z')-openingMonday)/weekMs).slug
}
export function weeklyReboot(now=new Date()){return edition(weekIndex(now))}
export function pastReboots(now=new Date()){return Array.from({length:weekIndex(now)},(_,i)=>edition(weekIndex(now)-i-1))}
export function programmeRoster(id:string,now=new Date()):Challenge|undefined {
  let slug:string,weekly=false,season=''
  if(id.startsWith('stunt:'))slug=id.slice(6)
  else if(/^weekly:\d{4}-\d{2}-\d{2}$/.test(id)){
    const index=(Date.parse(id.slice(7)+'T00:00:00Z')-openingMonday)/weekMs
    if(!Number.isInteger(index)||index<0||index>weekIndex(now)||edition(index).id!==id)return
    const week=edition(index);weekly=true;slug=week.slug;season='Weekly reboot · '+week.dates
  }else return
  const show=bySlug.get(slug)
  if(!show)return
  const pool=pools[show.pool]
  return {id,title:show.title,libraryType:'tv',season:weekly?season:'Stunt casting · '+pool.name,
    rule:(weekly?'Reboot this ensemble with living actors of your choice.':pool.name+'.')+' Any gender for any role. Use each actor once.',
    pool:weekly?'all':pool.tag,poolSourceId:weekly?undefined:pool.source,source:'',
    roles:show.roles.map(([name,originalActor,description],i)=>({id:'r'+(i+1),name,originalActor,description}))}
}
