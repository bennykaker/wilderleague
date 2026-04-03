import { unstable_cache } from 'next/cache'
import { createServiceClient } from '../../lib/supabase/service'

export interface Title {
  slug: string
  title: string
  year: number
  year_end: number | null
  type: 'movie' | 'tv' | 'play' | 'musical' | 'book'
  author: string | null
  tmdb_id: string
  poster_path: string
  backdrop_path: string
  logline: string
  budget: number
  // Movie
  production_budget: number | null
  production_budget_adjusted: number | null
  box_office_domestic: number | null
  box_office_worldwide: number | null
  flop_status: string | null
  director: string | null
  // TV
  seasons: number | null
  episodes: number | null
  budget_per_episode: number | null
  status: string | null
  showrunner: string | null
  network: string | null
  // Shared
  genre_tags: string | null
  location_set: string | null
  location_filmed: string | null
  studio: string | null
  source_material: string | null
  franchise: string | null
  rt_score: number | null
  awards: string | null
  casting_brief: string | null
  reboot_potential: number | null
  reboot_notes: string | null
}

export interface MarloweCache {
  reply: string
  actors: string[]
  suggestion: string | null
}

export interface Role {
  movie_slug: string
  role_name: string
  original_actor: string | null
  original_actor_image: string | null
  tier: 'first_lead' | 'second_lead' | 'third_lead' | 'supporting'
  seasons_appeared: string | null
  display_order: number
  role_description: string | null
  marlowe_cache: MarloweCache | null
  marlowe_quick: Record<string, MarloweCache> | null
}

const TITLE_COLUMNS = [
  'slug', 'title', 'year', 'year_end', 'type', 'tmdb_id',
  'poster_path', 'backdrop_path', 'logline', 'budget',
  'production_budget', 'production_budget_adjusted',
  'box_office_domestic', 'box_office_worldwide', 'flop_status', 'director',
  'seasons', 'episodes', 'budget_per_episode', 'status', 'showrunner', 'network',
  'genre_tags', 'location_set', 'location_filmed', 'studio',
  'source_material', 'franchise', 'rt_score', 'awards',
  'casting_brief', 'reboot_potential', 'reboot_notes', 'author',
].join(', ')

async function fetchTitles(): Promise<Title[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('titles')
    .select(TITLE_COLUMNS)
    .order('title', { ascending: true })

  if (error) throw new Error(`Failed to fetch titles: ${error.message}`)

  return ((data ?? []) as any[]).map(r => ({
    slug: r.slug,
    title: r.title,
    year: r.year ?? 0,
    year_end: r.year_end ?? null,
    type: r.type ?? 'movie',
    tmdb_id: r.tmdb_id ?? '',
    poster_path: r.poster_path ?? '',
    backdrop_path: r.backdrop_path ?? '',
    logline: r.logline ?? '',
    budget: r.budget ?? 50,
    production_budget: r.production_budget ?? null,
    production_budget_adjusted: r.production_budget_adjusted ?? null,
    box_office_domestic: r.box_office_domestic ?? null,
    box_office_worldwide: r.box_office_worldwide ?? null,
    flop_status: r.flop_status ?? null,
    director: r.director ?? null,
    seasons: r.seasons ?? null,
    episodes: r.episodes ?? null,
    budget_per_episode: r.budget_per_episode ?? null,
    status: r.status ?? null,
    showrunner: r.showrunner ?? null,
    network: r.network ?? null,
    genre_tags: r.genre_tags ?? null,
    location_set: r.location_set ?? null,
    location_filmed: r.location_filmed ?? null,
    studio: r.studio ?? null,
    source_material: r.source_material ?? null,
    franchise: r.franchise ?? null,
    rt_score: r.rt_score ?? null,
    awards: r.awards ?? null,
    casting_brief: r.casting_brief ?? null,
    reboot_potential: r.reboot_potential ?? null,
    reboot_notes: r.reboot_notes ?? null,
    author: r.author ?? null,
  }))
}

async function fetchRolesForSlug(slug: string): Promise<Role[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('roles')
    .select('title_slug, role_name, original_actor, original_actor_image, tier, seasons_appeared, display_order, role_description, marlowe_cache, marlowe_quick')
    .eq('title_slug', slug)
    .order('display_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch roles: ${error.message}`)

  return ((data ?? []) as any[]).map(r => ({
    movie_slug: r.title_slug,
    role_name: r.role_name,
    original_actor: r.original_actor ?? '',
    original_actor_image: r.original_actor_image ?? '',
    tier: (r.tier as Role['tier']) ?? 'supporting',
    seasons_appeared: r.seasons_appeared ?? null,
    display_order: r.display_order ?? 0,
    marlowe_cache: r.marlowe_cache ?? null,
    marlowe_quick: r.marlowe_quick ?? null,
    role_description: r.role_description ?? null,
  }))
}

// Cache for 1 hour — revalidate when enrichment updates data
const getCachedTitles = unstable_cache(fetchTitles, ['titles-v3'], { revalidate: 3600 })

function getCachedRolesForSlug(slug: string) {
  return fetchRolesForSlug(slug)
}

export async function getTitles(): Promise<Title[]> {
  return getCachedTitles()
}

export async function getTitle(slug: string): Promise<Title | null> {
  const titles = await getCachedTitles()
  return titles.find(t => t.slug === slug) ?? null
}

export async function getRolesForTitle(slug: string): Promise<Role[]> {
  return getCachedRolesForSlug(slug)
}

// Suggestions remain file-based for now
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

let _suggestions: Record<string, string>[] | null = null

export function getSuggestionsForTitle(slug: string): Record<string, string[]> {
  if (!_suggestions) {
    const filePath = path.join(process.cwd(), 'data', 'role-suggestions.csv')
    if (!fs.existsSync(filePath)) return {}
    const file = fs.readFileSync(filePath, 'utf8')
    _suggestions = Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true }).data
  }
  const result: Record<string, string[]> = {}
  _suggestions
    .filter(r => r.movie_slug === slug)
    .forEach(r => {
      result[r.role_name] = (r.suggestions ?? '').split(';').map((s: string) => s.trim()).filter(Boolean)
    })
  return result
}
