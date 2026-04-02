import challengesData from '../../data/challenges.json'

export interface Challenge {
  id: string
  label: string
  headline: string
  description: string
  badge: string
  movie_slug: string
  actor_pool: string[]
  actor_filter?: { known_for_tag?: string; show_names?: string[] }
  active: boolean
  starts: string
  ends: string
}

const _challenges = challengesData as Challenge[]

export function getChallenges(): Challenge[] {
  return _challenges
}

export function getActiveChallenge(): Challenge | null {
  return _challenges.find(c => c.active) ?? null
}

export function getChallenge(id: string): Challenge | null {
  return _challenges.find(c => c.id === id) ?? null
}
