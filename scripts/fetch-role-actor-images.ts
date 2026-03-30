/**
 * Backfill original_actor_image for roles that are missing it.
 * Looks up each original_actor name on TMDB and grabs their profile photo.
 * Run with: npx tsx scripts/fetch-role-actor-images.ts
 * Safe to re-run — only updates rows where original_actor_image is null/empty.
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TMDB_KEY = process.env.TMDB_API_KEY!
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

// Cache lookups so we don't re-fetch the same actor multiple times
const imageCache = new Map<string, string | null>()

async function fetchActorImage(name: string): Promise<string | null> {
  if (imageCache.has(name)) return imageCache.get(name)!

  // First check our own actors table
  const { data: local } = await supabase
    .from('actors')
    .select('headshot_url')
    .ilike('name', name)
    .not('headshot_url', 'is', null)
    .not('headshot_url', 'eq', '')
    .limit(1)
    .single()

  if (local?.headshot_url) {
    imageCache.set(name, local.headshot_url)
    return local.headshot_url
  }

  // Fall back to TMDB person search
  try {
    const url = `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TMDB_KEY}` } })
    const data = await res.json() as { results?: Array<{ profile_path?: string; popularity?: number }> }
    const result = data.results
      ?.filter(r => r.profile_path)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
    const imageUrl = result?.profile_path ? `${TMDB_IMG}${result.profile_path}` : null
    imageCache.set(name, imageUrl)
    return imageUrl
  } catch {
    imageCache.set(name, null)
    return null
  }
}

async function main() {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('title_slug, role_name, original_actor')
    .or('original_actor_image.is.null,original_actor_image.eq.')
    .order('title_slug', { ascending: true })

  if (error) throw new Error(error.message)
  if (!roles || roles.length === 0) {
    console.log('All roles already have actor images.')
    return
  }

  console.log(`Fetching images for ${roles.length} roles...\n`)

  let done = 0
  let notFound = 0
  let failed = 0

  for (const role of roles as any[]) {
    try {
      const imageUrl = await fetchActorImage(role.original_actor)

      if (!imageUrl) {
        notFound++
        console.log(`  ✗ Not found: ${role.original_actor} (${role.role_name})`)
        continue
      }

      const { error: updateError } = await supabase
        .from('roles')
        .update({ original_actor_image: imageUrl })
        .eq('title_slug', role.title_slug)
        .eq('role_name', role.role_name)

      if (updateError) throw new Error(updateError.message)

      done++
      if (done % 50 === 0) console.log(`  ... ${done} updated`)

      // Slight rate limit for TMDB (when we have to hit their API)
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      failed++
      console.error(`  ✗ ${role.original_actor}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} updated, ${notFound} not found, ${failed} errors.`)
}

main().catch(console.error)
