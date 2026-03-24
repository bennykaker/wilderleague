import fs from 'fs'
import path from 'path'

export interface Challenge {
  id: string
  week: string
  label: string
  headline: string
  description: string
  badge: string
  movie_slug: string
  // Explicit name allowlist (fallback / override)
  actor_pool: string[]
  // Filter by known_for tags (populated by seed-challenge-actors script)
  actor_filter?: { known_for_tag?: string; show_names?: string[] }
  active: boolean
  starts: string
  ends: string
}

let _challenges: Challenge[] | null = null

export function getChallenges(): Challenge[] {
  if (_challenges) return _challenges
  const file = fs.readFileSync(path.join(process.cwd(), 'data', 'challenges.json'), 'utf8')
  _challenges = JSON.parse(file) as Challenge[]
  return _challenges
}

export function getActiveChallenge(): Challenge | null {
  return getChallenges().find(c => c.active) ?? null
}

export function getChallenge(id: string): Challenge | null {
  return getChallenges().find(c => c.id === id) ?? null
}
