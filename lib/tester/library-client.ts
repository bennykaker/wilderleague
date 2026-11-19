import {rebootRule} from './reboot'
import type {Catalogue,Challenge} from './model'
export function customChallenge(value:unknown):Challenge{
 if(!value||typeof value!=='object')throw new Error('Enter a title and characters.')
 const b=value as Record<string,unknown>
 if(typeof b.title!=='string'||!b.title.trim()||b.title.length>120||!['book','show','movie'].includes(String(b.kind)))throw new Error('Enter a title (up to 120 characters) and format.')
 if(!Array.isArray(b.roles)||b.roles.length<1||b.roles.length>30||!b.roles.every(r=>typeof r==='string'&&r.trim()&&r.length<=80))throw new Error('Enter 1–30 characters, with one name per line (up to 80 characters each).')
 const names=b.roles.map(r=>(r as string).trim());if(new Set(names.map(n=>n.toLowerCase())).size!==names.length)throw new Error('Use each character name once.')
 return{id:'custom',title:b.title.trim(),season:`Your ${b.kind} · custom characters`,rule:'Reboot casting with living actors today. All genders welcome for every role. Use each actor once.',pool:'all',source:'',roles:names.map((name,i)=>({id:'r'+(i+1),name,originalActor:'',description:''}))}
}
export function withChallenge(cat:Catalogue,challenge:Challenge):Catalogue{if(challenge.pool==='all')challenge={...challenge,rule:rebootRule+' Use each actor once.'};return {...cat,challenges:[...cat.challenges.filter(c=>c.id!==challenge.id),challenge],pools:{...cat.pools,[challenge.id]:challenge.pool==='all'?cat.actors.map(a=>a.id):cat.pools[challenge.id]||[]}}}

// A book or universe cast may start with one role and grow over several sessions.
export function selectedLiteraryRoles(challenge:Challenge, roleIds:unknown):Challenge {
 if (roleIds === undefined) return challenge
 if (!challenge.literary || !Array.isArray(roleIds) || !roleIds.length || roleIds.length > challenge.roles.length)
   throw new Error('Choose at least one character from this roster.')
 const rolesById = new Map(challenge.roles.map(role => [role.id, role]))
 const seen = new Set<string>()
 const roles = roleIds.map(id => {
   const role = typeof id === 'string' && rolesById.get(id)
   if (!role || seen.has(id)) throw new Error('Each character must belong to this roster and appear once.')
   seen.add(id)
   return role
 })
 return {...challenge, roles}
}
