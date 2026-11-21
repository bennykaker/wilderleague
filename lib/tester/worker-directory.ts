import {getCloudflareContext} from '@opennextjs/cloudflare'
import type {Catalogue} from './model'

export async function cloudflareDirectory(refresh:()=>Promise<Catalogue>):Promise<Catalogue> {
  const {env,ctx}=getCloudflareContext()
  const key=new Request('https://www.wilderleague.com/__worker-cache/actor-directory-v1')
  const cache=await caches.open('wilderleague-public-catalogue')
  const hit=await cache.match(key)
  if(hit)return hit.json() as Promise<Catalogue>

  const fallback=await env.ASSETS!.fetch('https://assets.local/casting-directory.json')
  if(!fallback.ok)throw Error('The bundled casting directory is unavailable.')
  const current=await fallback.json() as Catalogue
  const cached=(data:Catalogue)=>Response.json(data,{headers:{'Cache-Control':'public, max-age=3600'}})
  await cache.put(key,cached(current))
  ctx.waitUntil((async()=>{
    try {
      const fresh=await refresh()
      if(fresh.actors.length)await cache.put(key,cached(fresh))
    }catch{ /* The published catalogue stays available until the next refresh. */ }
  })())
  return current
}
