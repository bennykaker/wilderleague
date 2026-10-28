import type {CastSnapshot,Catalogue} from './model'
export function castBase(s:CastSnapshot){return {challengeId:s.challenge.id,title:s.challenge.title,season:s.challenge.season,rule:s.challenge.rule,pitch:s.pitch,roles:s.challenge.roles.map((r,i)=>({roleId:r.id,role:r.name,brief:r.description,actorId:s.actors[i].id,actor:s.actors[i].name}))}}
// A display identifier, not authentication. Import also checks the complete original cast.
export function castReference(s:CastSnapshot){let h=2166136261;for(const c of JSON.stringify(castBase(s))){h=Math.imul(h^c.charCodeAt(0),16777619)}return 'wl-cast-'+(h>>>0).toString(16)}
export function returnTemplate(s:CastSnapshot){return {format:'wilderleague-return-v1',castId:castReference(s),original:castBase(s),feedback:'Your overall qualitative analysis here.',questions:['A question for the caster'],changes:[] as {roleId:string;originalActorId:string;proposedActorId:string|null;proposedActorName:string;reason:string}[]}}
export type ImportedChange={roleId:string;originalActorId:string;proposedActorId:string|null;proposedActorName:string;reason:string;matchedId:string|null}
export type ImportedReview={castId:string;original:ReturnType<typeof castBase>;feedback:string;questions:string[];changes:ImportedChange[]}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
export function parseReturn(raw:string,s:CastSnapshot,cat:Catalogue):ImportedReview{
 if(new TextEncoder().encode(raw).length>100000)throw Error('Keep the response under 100 KB.')
 let value;try{value=JSON.parse(raw.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/,'$1'))}catch{throw Error('Paste the JSON return object from your AI, without surrounding commentary.')}
 if(!value||value.format!=='wilderleague-return-v1')throw Error('This is not a WilderLeague return file. Use the return format in your export.')
 const base=castBase(s)
 // Compare fields rather than JSON property order; unknown fields cannot change the cast.
 if(value.castId!==castReference(s)||!value.original||['challengeId','title','season','rule','pitch'].some(k=>value.original[k]!==base[k as keyof typeof base])||!Array.isArray(value.original.roles)||value.original.roles.length!==base.roles.length||base.roles.some((r,i)=>Object.entries(r).some(([k,v])=>value.original.roles[i]?.[k]!==v)))throw Error('This response belongs to a different version of your cast. Reopen the original choices or export your current cast again.')
 if(typeof value.feedback!=='string'||value.feedback.length>15000||!Array.isArray(value.questions)||value.questions.length>20||value.questions.some((q:unknown)=>typeof q!=='string'||q.length>1500)||!Array.isArray(value.changes)||value.changes.length>s.challenge.roles.length)throw Error('The response has invalid or oversized feedback fields.')
 const seen=new Set<string>(),pool=new Set(cat.pools[s.challenge.id])
 const changes=value.changes.map((c:Record<string,unknown>)=>{
  if(!c||typeof c!=='object'||typeof c.roleId!=='string'||seen.has(c.roleId))throw Error('Each proposed change must name a different valid role.')
  const i=s.challenge.roles.findIndex(r=>r.id===c.roleId);if(i<0||c.originalActorId!==s.actors[i].id)throw Error('A change has an incorrect role or original actor ID.')
  if((c.proposedActorId!==null&&typeof c.proposedActorId!=='string')||typeof c.proposedActorName!=='string'||!c.proposedActorName.trim()||c.proposedActorName.length>150||typeof c.reason!=='string'||c.reason.length>3000)throw Error('A proposed actor or reason is missing or too long.')
  seen.add(c.roleId)
  const candidates=cat.actors.filter(a=>pool.has(a.id)&&normalize(a.name)===normalize(c.proposedActorName as string))
  const match=c.proposedActorId?candidates.find(a=>a.id===c.proposedActorId):candidates.length===1?candidates[0]:undefined
  return {...c,matchedId:match?.id||null} as ImportedChange
 })
 return {castId:value.castId,original:base,feedback:value.feedback,questions:value.questions,changes}
}
export function applyReturn(s:CastSnapshot,review:ImportedReview,selections:Record<string,string>,cat:Catalogue){
 if(JSON.stringify(castBase(s))!==JSON.stringify(review.original))throw Error('Your cast changed after importing. Import the response again before applying it.')
 const picks=s.actors.map(a=>a.id),pool=new Set(cat.pools[s.challenge.id])
 for(const [roleId,actorId] of Object.entries(selections)){if(!review.changes.some(c=>c.roleId===roleId))throw Error('Unknown proposed role.');const i=s.challenge.roles.findIndex(r=>r.id===roleId);if(i<0||!pool.has(actorId)||!cat.actors.some(a=>a.id===actorId))throw Error('Choose an eligible catalogue actor for each accepted change.');picks[i]=actorId}
 if(new Set(picks).size!==picks.length)throw Error('These changes use an actor twice. Accept the related swap too, or choose a different actor.')
 return picks
}
