export const CHALLENGE_ID = 'snl-breaking-bad-quick-v1'
export const STORAGE_KEY = `wilderleague:${CHALLENGE_ID}`
export type Actor = { id: string; name: string; image: string; knownFor: string }
export type Role = { name: string; originalActor: string; originalImage: string; description: string }
export type QuickData = { title: string; slug: string; actors: Actor[]; roles: Role[] }
export type Picks = [string | null, string | null, string | null]
export type SavedCast = { id: string; picks: Picks; savedAt: string }
export function validPicks(value: unknown, actors: Actor[], complete = false): value is Picks {
  if (!Array.isArray(value) || value.length !== 3) return false
  const ids = new Set(actors.map(a => a.id))
  if (!value.every(id => (id === null && !complete) || (typeof id === 'string' && ids.has(id)))) return false
  const chosen = value.filter(id => id !== null)
  return new Set(chosen).size === chosen.length
}
export function encodeCast(picks: Picks): string {
  return JSON.stringify(picks)
}
export function decodeCast(raw: string, actors: Actor[]): Picks | null {
  if (raw.length > 2000) return null
  try { const picks: unknown = JSON.parse(raw); return validPicks(picks, actors, true) ? picks : null } catch { return null }
}
