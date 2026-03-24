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
  godfather: {
    slug: 'godfather',
    title: 'The Godfather',
    year: 1972,
    budget: 80,
    logline: 'The patriarch of an organized crime dynasty transfers control to his reluctant son.',
    roles: ['Michael Corleone', 'Vito Corleone', 'Sonny Corleone', 'Tom Hagen', 'Kay Adams'],
    originalCast: {
      'Michael Corleone': 'Al Pacino',
      'Vito Corleone': 'Marlon Brando',
      'Sonny Corleone': 'James Caan',
      'Tom Hagen': 'Robert Duvall',
      'Kay Adams': 'Diane Keaton',
    },
  },
  pulpfiction: {
    slug: 'pulpfiction',
    title: 'Pulp Fiction',
    year: 1994,
    budget: 80,
    logline: 'Intertwining stories of criminals, a boxer, and hitmen in Los Angeles.',
    roles: ['Vincent Vega', 'Jules Winnfield', 'Mia Wallace', 'Butch Coolidge', 'Marsellus Wallace'],
    originalCast: {
      'Vincent Vega': 'John Travolta',
      'Jules Winnfield': 'Samuel L. Jackson',
      'Mia Wallace': 'Uma Thurman',
      'Butch Coolidge': 'Bruce Willis',
      'Marsellus Wallace': 'Ving Rhames',
    },
  },
  diehard: {
    slug: 'diehard',
    title: 'Die Hard',
    year: 1988,
    budget: 70,
    logline: 'A New York cop battles terrorists who have taken over a Los Angeles skyscraper.',
    roles: ['John McClane', 'Hans Gruber', 'Al Powell', 'Holly Gennaro'],
    originalCast: {
      'John McClane': 'Bruce Willis',
      'Hans Gruber': 'Alan Rickman',
      'Al Powell': 'Reginald VelJohnson',
      'Holly Gennaro': 'Bonnie Bedelia',
    },
  },
}
