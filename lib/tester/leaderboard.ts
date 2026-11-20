export type BoardCategory = 'best' | 'hear'
export type Vote = -1 | 0 | 1
export type BoardRating = {
  up: number
  down: number
  mine: Vote
  ai: number | null
  score: number | null
}
