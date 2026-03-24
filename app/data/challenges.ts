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
  actor_pool: string[]
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
