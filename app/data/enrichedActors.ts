import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export interface EnrichedActor {
  name: string
  tmdb_id: string
  headshot_url: string
  popularity: number
  gender: string
  birth_year: string
  biography: string
  known_for: string
  keywords: string
  notes: string
  cost: number
  archetype?: string
  strengths?: string
  weaknesses?: string
  best_cast_as?: string
  signature_quality?: string
  career_stage?: string
  casting_profile?: string
  deep_dive_date?: string
}

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

let _cache: EnrichedActor[] | null = null

export function getEnrichedActors(): EnrichedActor[] {
  if (_cache) return _cache

  // Use enriched file if available, fall back to base actors.csv
  const enrichedPath = path.join(process.cwd(), 'data', 'enriched-actors.csv')
  const basePath = path.join(process.cwd(), 'data', 'actors.csv')
  const filePath = fs.existsSync(enrichedPath) ? enrichedPath : basePath

  const file = fs.readFileSync(filePath, 'utf8')
  const parsed = Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true })

  _cache = parsed.data
    .filter(row => row.name?.trim())
    .map(row => {
      const pop = parseFloat(row.popularity ?? '0') || 0
      return {
        name: row.name.trim(),
        tmdb_id: row.tmdb_id?.trim() ?? '',
        headshot_url: row.headshot_url?.trim() ?? '',
        popularity: pop,
        gender: row.gender?.trim() ?? '',
        birth_year: row.birth_year?.trim() ?? '',
        biography: row.biography?.trim() ?? '',
        known_for: row.known_for?.trim() ?? '',
        keywords: row.keywords?.trim() ?? '',
        notes: row.notes?.trim() ?? '',
        cost: popularityToCost(pop),
        archetype: row.archetype?.trim() || undefined,
        strengths: row.strengths?.trim() || undefined,
        weaknesses: row.weaknesses?.trim() || undefined,
        best_cast_as: row.best_cast_as?.trim() || undefined,
        signature_quality: row.signature_quality?.trim() || undefined,
        career_stage: row.career_stage?.trim() || undefined,
        casting_profile: row.casting_profile?.trim() || undefined,
        deep_dive_date: row.deep_dive_date?.trim() || undefined,
      }
    })
    .sort((a, b) => b.popularity - a.popularity)

  return _cache
}
