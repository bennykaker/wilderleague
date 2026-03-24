import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export interface PoolActor {
  name: string
  cost: number
  popularity: number
}

interface CsvRow {
  name?: string
  popularity?: string
}

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

let _cache: PoolActor[] | null = null

export function getActorPool(): PoolActor[] {
  if (_cache) return _cache

  const filePath = path.join(process.cwd(), 'data', 'actors.csv')
  const file = fs.readFileSync(filePath, 'utf8')

  const parsed = Papa.parse<CsvRow>(file, { header: true, skipEmptyLines: true })

  _cache = (parsed.data as CsvRow[])
    .filter(row => row.name && row.name.trim())
    .map(row => {
      const pop = parseFloat(row.popularity ?? '0') || 0
      return {
        name: row.name!.trim(),
        cost: popularityToCost(pop),
        popularity: pop,
      }
    })
    .sort((a, b) => b.popularity - a.popularity)

  return _cache
}
