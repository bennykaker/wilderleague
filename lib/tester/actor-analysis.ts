import {readFileSync} from 'node:fs'
import path from 'node:path'
import {parse} from 'csv-parse/sync'

export const analysisFields = ['casting_profile','signature_quality','archetype','strengths','weaknesses','best_cast_as','career_stage'] as const
export type ActorAnalysis = Partial<Record<(typeof analysisFields)[number],string>>

// Older database imports left some or all of the original CSV columns empty.
export function mergeAnalysis(current?:ActorAnalysis|null, archived?:ActorAnalysis):ActorAnalysis|null {
  const result:ActorAnalysis = {}
  for (const field of analysisFields) {
    const text = current?.[field]?.trim() || archived?.[field]?.trim()
    if (text) result[field] = text
  }
  return Object.keys(result).length ? result : null
}

let archive:Map<string,ActorAnalysis> | undefined
export function archivedAnalysis(id:string) {
  if (!archive) {
    const csv = readFileSync(path.join(process.cwd(),'data','enriched-actors.csv'),'utf8')
    const rows:(ActorAnalysis & {tmdb_id:string})[] = parse(csv,{columns:true,skip_empty_lines:true})
    const profiles = new Map<string,ActorAnalysis>()
    for (const row of rows) {
      const profile = mergeAnalysis(row)
      if (profile && row.tmdb_id) profiles.set(row.tmdb_id,profile)
    }
    archive = profiles
  }
  return archive.get(id)
}
