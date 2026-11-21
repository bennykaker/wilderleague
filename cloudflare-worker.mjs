import {createClient} from '@supabase/supabase-js'
import {refreshTitles} from './lib/refresh-titles.ts'
import openNext from './.open-next/worker.js'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import renderer from '@resvg/resvg-wasm/index_bg.wasm'
import geist from 'next/dist/compiled/@vercel/og/Geist-Regular.ttf'

export * from './.open-next/worker.js'

let rendererReady
async function renderCastPng(svg) {
  rendererReady ??= initWasm(renderer)
  await rendererReady
  const tree = new Resvg(svg, {
    font: { loadSystemFonts: false, fontBuffers: [new Uint8Array(geist)], defaultFontFamily: 'Geist', sansSerifFamily: 'Geist' },
  })
  try {
    const image = tree.render()
    try { return image.asPng().slice() } finally { image.free() }
  } finally { tree.free() }
}

export default {
  async scheduled(_event, env) {
    const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
    const result=await refreshTitles(db,env.TMDB_API_KEY)
    if(!result.ok)throw new Error('Monthly title refresh failed')
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.hostname === 'wilderleague.com') {
      url.hostname = 'www.wilderleague.com'
      return Response.redirect(url.toString(), 308)
    }
    const result = await openNext.fetch(request, { ...env, WL_MEDIA: { renderCastPng } }, ctx)
    const response = new Response(result.body, result)
    response.headers.set('X-WilderLeague-Host', 'cloudflare-workers')
    return response
  },
}
