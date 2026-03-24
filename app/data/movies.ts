export interface Movie {
  slug: string
  title: string
  year: number
  budget: number
  roles: string[]
  originalCast: Record<string, string>
  logline: string
}

export const movies: Record<string, Movie> = {
  matrix: {
    slug: 'matrix',
    title: 'The Matrix',
    year: 1999,
    budget: 100,
    logline: 'A computer hacker discovers reality is a simulation and joins a rebellion.',
    roles: ['Neo', 'Trinity', 'Morpheus', 'Agent Smith'],
    originalCast: {
      'Neo': 'Keanu Reeves',
      'Trinity': 'Carrie-Anne Moss',
      'Morpheus': 'Laurence Fishburne',
      'Agent Smith': 'Hugo Weaving',
    },
  },

}
