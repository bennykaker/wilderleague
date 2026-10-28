import { unstable_cache } from 'next/cache'
import { createServiceClient } from '../supabase/service'
import { getTitle, getRolesForTitle } from '../../app/data/titles'
import { getChallenge } from '../../app/data/challenges'
import type { QuickData } from './model'

async function fetchQuickCastData(): Promise<QuickData> {
  const challenge = getChallenge('snl-breaking-bad')
  if (!challenge) throw new Error('The SNL challenge could not be found.')
  const [title, roles, actors] = await Promise.all([
    getTitle(challenge.movie_slug), getRolesForTitle(challenge.movie_slug), fetchPool(challenge.actor_filter?.universe_tag, challenge.actor_pool),
  ])
  if (!title) throw new Error('Breaking Bad could not be loaded.')
  const roleNames = ['Walter White', 'Jesse Pinkman', 'Skyler White']
  const selectedRoles = roleNames.map(name => {
    const role = roles.find(r => r.role_name.toLowerCase() === name.toLowerCase())
    if (!role) throw new Error(`Missing role: ${name}`)
    return { name: role.role_name, originalActor: role.original_actor || '', originalImage: role.original_actor_image || '', description: role.role_description || '' }
  })
  const explicit = new Set(challenge.actor_pool.map(n => n.toLowerCase()))
  const tag = challenge.actor_filter?.universe_tag
  if (!tag && explicit.size === 0) throw new Error('The challenge actor pool has no eligibility rule.')
  const seen = new Set<string>()
  const pool = actors.filter(a => explicit.has(a.name.toLowerCase()) || (tag && a.universe_tags?.includes(tag)))
    .sort((a,b) => b.popularity-a.popularity)
    .map(a => ({ id: a.tmdb_id ? `tmdb:${a.tmdb_id}` : `name:${a.name.toLowerCase()}`, name: a.name, image: a.headshot_url, knownFor: a.known_for }))
    .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
  if (pool.length < 3) throw new Error('Not enough eligible actors are available.')
  return { title: title.title, slug: title.slug, roles: selectedRoles, actors: pool }
}

interface ActorRow { name:string; tmdb_id:string|null; headshot_url:string|null; known_for:string|null; universe_tags:string|null; popularity:number|null }
async function fetchPool(tag:string|undefined, explicit:string[]) {
  const db=createServiceClient()
  const columns='name, tmdb_id, headshot_url, known_for, universe_tags, popularity'
  const rows:ActorRow[]=[]
  if(tag){
    for(let from=0;;from+=1000){
      const {data,error}=await db.from('actors').select(columns).ilike('universe_tags',`%${tag}%`).order('name').range(from,from+999)
      if(error)throw new Error('Unable to load the challenge actor pool.')
      rows.push(...(data||[]))
      if(!data||data.length<1000)break
    }
  }
  if(explicit.length){
    const {data,error}=await db.from('actors').select(columns).in('name',explicit)
    if(error)throw new Error('Unable to load the named challenge actors.')
    rows.push(...(data||[]))
  }
  return rows.map(a=>({...a,popularity:Number(a.popularity)||0,known_for:a.known_for||'',headshot_url:a.headshot_url||'',universe_tags:(a.universe_tags||'').split(',').map(s=>s.trim())}))
}
export const getQuickCastData=unstable_cache(fetchQuickCastData,['quick-cast-snl-v1'],{revalidate:3600})
