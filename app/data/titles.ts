import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export interface Title {
  slug: string
  title: string
  year: number
  type: 'movie' | 'tv'
  tmdb_id: string
  poster_path: string
  backdrop_path: string
  logline: string
  budget: number
}

export interface Role {
  movie_slug: string
  role_name: string
  original_actor: string
  original_actor_image: string
}

let _titles: Title[] | null = null
let _roles: Role[] | null = null

export function getTitles(): Title[] {
  if (_titles) return _titles
  const file = fs.readFileSync(path.join(process.cwd(), 'data', 'titles.csv'), 'utf8')
  const parsed = Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true })
  _titles = parsed.data.filter(r => r.slug).map(r => ({
    slug: r.slug,
    title: r.title,
    year: parseInt(r.year) || 0,
    type: (r.type as 'movie' | 'tv') || 'movie',
    tmdb_id: r.tmdb_id,
    poster_path: r.poster_path,
    backdrop_path: r.backdrop_path,
    logline: r.logline,
    budget: parseInt(r.budget) || 100,
  }))
  return _titles
}

export function getTitle(slug: string): Title | null {
  return getTitles().find(t => t.slug === slug) ?? null
}

export interface Suggestion {
  role_name: string
  actors: string[]
}

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
      result[r.role_name] = (r.suggestions ?? '').split(';').map(s => s.trim()).filter(Boolean)
    })
  return result
}

export function getRolesForTitle(slug: string): Role[] {
  if (!_roles) {
    const file = fs.readFileSync(path.join(process.cwd(), 'data', 'roles.csv'), 'utf8')
    const parsed = Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true })
    _roles = parsed.data.filter(r => r.movie_slug && r.role_name).map(r => ({
      movie_slug: r.movie_slug,
      role_name: r.role_name,
      original_actor: r.original_actor,
      original_actor_image: r.original_actor_image,
    }))
  }
  return _roles.filter(r => r.movie_slug === slug)
}
