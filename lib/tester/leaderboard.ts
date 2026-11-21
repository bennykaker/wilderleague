import type {Challenge} from './model'

export type BoardCategory = 'best' | 'hear'
export type Vote = -1 | 0 | 1
export type BoardRating = {
  up: number
  down: number
  mine: Vote
  ai: number | null
  score: number | null
}

export function hasLeaderboard(challenge:Challenge | undefined) {
  if (!challenge || challenge.id==='custom') return false
  return !challenge.id.startsWith('free:') || challenge.literary?.kind==='book' || challenge.libraryType==='book'
}
