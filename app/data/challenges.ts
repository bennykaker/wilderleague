export interface ChallengeFilter {
  known_for_tag?: string        // special tag matched against curated show list
  known_for_shows?: string[]    // match if any show appears in actor.known_for (semicolon-sep)
  universe_tag?: string         // match if actor.universe_tags includes this (e.g. 'LorreVerse')
  nationality?: string          // match if actor.nationality contains this (case-insensitive)
  nationality_exclude?: string  // exclude if actor.nationality contains this (case-insensitive)
  race_ethnicity?: string       // match if actor.race_ethnicity contains this (case-insensitive)
  gender?: string               // 'male' | 'female'
  birth_year_max?: number       // actor must be born in this year or earlier
  birth_year_min?: number       // actor must be born in this year or later
  keywords_include?: string     // match if actor.keywords contains this (case-insensitive)
}

export interface Challenge {
  id: string
  label: string
  headline: string
  teaser: string        // two-line hook: "Recast X.\nBut constraint only."
  description: string
  badge: string
  movie_slug: string
  actor_pool: string[]           // explicit actor names always included (regardless of filter)
  actor_filter?: ChallengeFilter // data-driven filter; actor must match ALL criteria
  active: boolean
  starts: string
  ends: string
}

const CHALLENGES: Challenge[] = [
  // 1
  {
    id: 'lorrevese-gladiator',
    label: 'Casting Challenge',
    headline: 'Recast Gladiator — Chuck Lorre actors only',
    teaser: 'Recast Gladiator.\nBut Chuck Lorre actors only.',
    description: 'Maximus, Commodus, Proximo, Lucilla — every role filled by an actor from the Chuck Lorre universe. Big Bang Theory. Two and a Half Men. Mom. Young Sheldon. The Colosseum has a laugh track.',
    badge: '🏟️',
    movie_slug: 'gladiator',
    actor_filter: { universe_tag: 'LorreVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 2
  {
    id: 'sorkverse-lotr',
    label: 'Casting Challenge',
    headline: 'Recast The Fellowship of the Ring — West Wing actors only',
    teaser: 'Recast The Fellowship of the Ring.\nBut West Wing actors only.',
    description: 'The Fellowship of the Senior Staff. Every role filled by an actor from the Aaron Sorkin universe — The West Wing, The Newsroom, A Few Good Men. Aragorn has a walk-and-talk monologue. It\'s very good.',
    badge: '💍',
    movie_slug: 'lotr-fellowship-of-the-ring',
    actor_filter: { universe_tag: 'WestWingVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 3
  {
    id: 'canadian-parks-rec',
    label: 'Casting Challenge',
    headline: 'Recast Parks & Recreation — Canadian actors only',
    teaser: 'Recast Parks & Recreation.\nBut Canadian actors only.',
    description: 'Pawnee, Indiana by way of Toronto, Vancouver, and everywhere in between. Every role must be filled by a Canadian actor. Leslie Knope has very strong opinions about poutine.',
    badge: '🍁',
    movie_slug: 'parks-and-recreation',
    actor_filter: { nationality: 'canada' },
    actor_pool: [
      'Ryan Reynolds', 'Rachel McAdams', 'Jim Carrey', 'Martin Short', 'Mike Myers',
      'Dan Aykroyd', 'Brendan Fraser', 'Michael J. Fox', 'William Shatner',
      'Donald Sutherland', 'Kiefer Sutherland', 'Neve Campbell', 'Seth Rogen',
      'Jay Baruchel', 'Cobie Smulders', 'Tatiana Maslany', 'Elliot Page',
      'Ryan Gosling', 'Evangeline Lilly', 'Hayden Christensen', 'Nathan Fillion',
      'Dan Levy', 'Eugene Levy', 'Catherine O\'Hara', 'Annie Murphy',
      'Sandra Oh', 'Eric McCormack', 'Victor Garber', 'Paul Gross',
      'Leslie Nielsen', 'Howie Mandel', 'Sarah Polley', 'Tom Cavanagh',
    ],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 4
  {
    id: 'dixie-good-place',
    label: 'Casting Challenge',
    headline: 'Recast The Good Place — Florida, Alabama, and Georgia only',
    teaser: 'Recast The Good Place.\nBut actors from Florida, Alabama, and Georgia only.',
    description: 'Heaven, staffed by the Deep South and the Sunshine State. Every role must be filled by an actor born or raised in Florida, Alabama, or Georgia. The afterlife has sweet tea.',
    badge: '🌴',
    movie_slug: 'the-good-place',
    actor_pool: [
      // Georgia
      'Julia Roberts', 'Kim Basinger', 'Holly Hunter', 'Laurence Fishburne',
      'Dakota Fanning', 'Ed Helms', 'Burt Reynolds', 'Donald Glover',
      'Chloe Grace Moretz', 'Jeff Foxworthy', 'Ryan Seacrest',
      // Alabama
      'Courteney Cox', 'Octavia Spencer', 'Channing Tatum', 'Kate Jackson',
      'Louise Fletcher', 'Jim Nabors', 'Nell Carter',
      // Florida
      'Faye Dunaway', 'Wesley Snipes', 'Sidney Poitier',
    ],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 5
  {
    id: 'snl-breaking-bad',
    label: 'Casting Challenge',
    headline: 'Recast Breaking Bad — SNL alumni only',
    teaser: 'Recast Breaking Bad.\nBut SNL alumni only.',
    description: 'Your Albuquerque meth empire, staffed entirely by current and former Saturday Night Live cast members. Walter White was in a sketch once. Jesse Pinkman did Weekend Update. The chemistry teacher bit killed.',
    badge: '🎤',
    movie_slug: 'breaking-bad',
    actor_filter: { universe_tag: 'SNLVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 6
  {
    id: 'gilligan-star-trek-tng',
    label: 'Casting Challenge',
    headline: 'Recast Star Trek: TNG — Breaking Bad actors only',
    teaser: 'Recast Star Trek: The Next Generation.\nBut Breaking Bad actors only.',
    description: 'The Enterprise-D, crewed by the cast of Breaking Bad and Better Call Saul. Bryan Cranston sits in the captain\'s chair. Jonathan Banks is chief of security. The Borg have a very specific offer.',
    badge: '🖖',
    movie_slug: 'star-trek-tng',
    actor_filter: { universe_tag: 'BreakingBadVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 7
  {
    id: 'whoverse-new-hope',
    label: 'Casting Challenge',
    headline: 'Recast A New Hope — Doctor Who actors only',
    teaser: 'Recast Star Wars: A New Hope.\nBut Doctor Who actors only.',
    description: 'A galaxy far, far away, cast from across sixty years of the TARDIS. Classic Who, New Who, Torchwood, Sarah Jane — they\'re all available. Luke Skywalker has regenerated.',
    badge: '⭐',
    movie_slug: 'star-wars-a-new-hope',
    actor_filter: { universe_tag: 'WhoVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 8
  {
    id: 'starwars-the-wire',
    label: 'Casting Challenge',
    headline: 'Recast The Wire — Star Wars actors only',
    teaser: 'Recast The Wire.\nBut Star Wars actors only.',
    description: 'The corners of Baltimore, cast from across a galaxy far, far away. The Skywalker Saga. The Clone Wars. Andor. The Mandalorian. Omar Little has a very particular code. And a lightsaber.',
    badge: '🌃',
    movie_slug: 'the-wire',
    actor_filter: { universe_tag: 'StarWarsVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 9
  {
    id: 'oscar-firefly',
    label: 'Casting Challenge',
    headline: 'Recast Firefly — Oscar winners only',
    teaser: 'Recast Firefly.\nBut Oscar winners only.',
    description: 'Fill the nine seats on Serenity with Academy Award winners. Mal Reynolds has a trophy. Zoe has a trophy. Jayne has a trophy and he is very confused about it. The cargo hold has never smelled more prestigious.',
    badge: '🏆',
    movie_slug: 'firefly',
    actor_pool: [
      'Meryl Streep', 'Daniel Day-Lewis', 'Cate Blanchett', 'Anthony Hopkins',
      'Tom Hanks', 'Denzel Washington', 'Halle Berry', 'Charlize Theron',
      'Hilary Swank', 'Sean Penn', 'Philip Seymour Hoffman', 'Helen Mirren',
      'Forest Whitaker', 'Marion Cotillard', 'Jeff Bridges', 'Natalie Portman',
      'Colin Firth', 'Jennifer Lawrence', 'Matthew McConaughey', 'Lupita Nyong\'o',
      'Eddie Redmayne', 'Julianne Moore', 'Leonardo DiCaprio', 'Brie Larson',
      'Casey Affleck', 'Emma Stone', 'Frances McDormand', 'Gary Oldman',
      'Olivia Colman', 'Joaquin Phoenix', 'Renée Zellweger', 'Jessica Lange',
      'Kathy Bates', 'Emma Thompson', 'Holly Hunter', 'Gene Hackman',
      'Jack Nicholson', 'Dustin Hoffman', 'Robert De Niro', 'Robert Duvall',
      'Adrien Brody', 'Timothy Hutman', 'F. Murray Abraham', 'Ben Kingsley',
      'Lou Gossett Jr.', 'Goldie Hawn', 'Sally Field', 'Diane Keaton',
      'Maggie Smith', 'Liza Minnelli', 'Jamie Foxx', 'Morgan Freeman',
      'Octavia Spencer', 'Viola Davis', 'Alicia Vikander', 'Christopher Walken',
      'Judi Dench', 'Tatum O\'Neal', 'Whoopi Goldberg', 'Dianne Wiest',
      'Geena Davis', 'Mercedes Ruehl', 'Kim Basinger', 'Angelina Jolie',
      'Benicio del Toro', 'Jim Broadbent', 'Catherine Zeta-Jones',
      'Rachel Weisz', 'Jennifer Connelly', 'Reese Witherspoon',
    ],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 10
  {
    id: 'international-ted-lasso',
    label: 'Casting Challenge',
    headline: 'Recast Ted Lasso — born outside the United States',
    teaser: 'Recast Ted Lasso.\nBut no Americans.',
    description: 'The one American in the room has to go. Every role — including Ted himself — must be filled by an actor born outside the United States. It\'s an international club. Act like it.',
    badge: '⚽',
    movie_slug: 'ted-lasso',
    actor_filter: { nationality_exclude: 'united states' },
    actor_pool: [
      'Anthony Hopkins', 'Gary Oldman', 'Daniel Craig', 'Tom Hardy', 'Idris Elba',
      'Benedict Cumberbatch', 'Jude Law', 'Colin Firth', 'Ralph Fiennes', 'Jeremy Irons',
      'Michael Fassbender', 'James McAvoy', 'Christian Bale', 'Andrew Garfield',
      'Cate Blanchett', 'Nicole Kidman', 'Rachel Weisz', 'Emily Blunt', 'Keira Knightley',
      'Russell Crowe', 'Geoffrey Rush', 'Hugo Weaving', 'Guy Pearce', 'Sam Neill',
      'Javier Bardem', 'Penélope Cruz', 'Antonio Banderas', 'Gael García Bernal',
      'Pedro Pascal', 'Viggo Mortensen', 'Mads Mikkelsen', 'Alexander Skarsgård',
      'Ryan Reynolds', 'Rachel McAdams', 'Ryan Gosling', 'Brendan Fraser',
      'Michael J. Fox', 'William Shatner', 'Kiefer Sutherland', 'Nathan Fillion',
      'Liam Neeson', 'Ciaran Hinds', 'Brendan Gleeson', 'Colin Farrell',
      'Paddy Considine', 'Eddie Marsan', 'Jim Broadbent', 'Timothy Spall',
    ],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 11
  {
    id: 'comeback-west-wing',
    label: 'Casting Challenge',
    headline: 'Recast The West Wing — actors who need a comeback',
    teaser: 'Recast The West Wing.\nBut actors who need a comeback.',
    description: 'Bartlet\'s senior staff, assembled from the career wilderness. These are actors who were once everywhere and then weren\'t. The Oval Office is a second act. Make the calls.',
    badge: '📞',
    movie_slug: 'the-west-wing',
    actor_pool: [
      'John Travolta', 'Nicolas Cage', 'Mickey Rourke', 'Rob Schneider', 'Pauly Shore',
      'Jon Lovitz', 'Dana Carvey', 'Cuba Gooding Jr.', 'Chris Kattan', 'Martin Lawrence',
      'Brendan Fraser', 'Corey Feldman', 'Macaulay Culkin', 'Chris Tucker',
      'Janeane Garofalo', 'David Spade', 'Matt LeBlanc', 'Tom Arnold',
      'Andrew Dice Clay', 'Steven Seagal', 'Jean-Claude Van Damme', 'Dolph Lundgren',
      'Lorenzo Lamas', 'Corey Haim', 'Scott Baio', 'James Van Der Beek',
      'Matthew Lillard', 'Skeet Ulrich', 'Tara Reid', 'Joey Lawrence',
    ],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 12
  {
    id: 'whedonverse-bcs',
    label: 'Casting Challenge',
    headline: 'Recast Better Call Saul — Whedonverse actors only',
    teaser: 'Recast Better Call Saul.\nBut Whedonverse actors only.',
    description: 'The ABQ legal-criminal machine, cast from Buffy, Angel, Firefly, Dollhouse, and the rest of the Whedonverse. Saul Goodman passed the bar in Sunnydale. Mike Ehrmantraut worked the Hellmouth.',
    badge: '⚖️',
    movie_slug: 'better-call-saul',
    actor_filter: { universe_tag: 'WhedonVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 13
  {
    id: 'snl-brooklyn-99',
    label: 'Casting Challenge',
    headline: 'Recast Brooklyn Nine-Nine — SNL alumni only',
    teaser: 'Recast Brooklyn Nine-Nine.\nBut SNL alumni only.',
    description: 'The 99th Precinct, staffed entirely from Studio 8H. Current and former Saturday Night Live cast members only. Captain Holt gives a cold open. Nine-nine.',
    badge: '🚔',
    movie_slug: 'brooklyn-nine-nine',
    actor_filter: { universe_tag: 'SNLVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 14
  {
    id: 'snl-fellowship',
    label: 'Casting Challenge',
    headline: 'Recast The Fellowship of the Ring — SNL cast only',
    teaser: 'Recast The Fellowship of the Ring.\nBut SNL cast members only.',
    description: 'Nine cast members. Nine rings. One sketch comedy alumni pool spanning fifty years. Frodo is a featured player. Gandalf hosted five times. The Dark Lord has a recurring character.',
    badge: '🌋',
    movie_slug: 'lotr-fellowship-of-the-ring',
    actor_filter: { universe_tag: 'SNLVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 15
  {
    id: 'no-americans-seinfeld',
    label: 'Casting Challenge',
    headline: 'Recast Seinfeld — non-Americans only',
    teaser: 'Recast Seinfeld.\nBut no Americans.',
    description: 'A show about nothing, cast by people who had to look it up. Jerry, George, Elaine, Kramer — every role filled by an actor born outside the United States. Newman is inexplicably Australian.',
    badge: '🌍',
    movie_slug: 'seinfeld',
    actor_filter: { nationality_exclude: 'united states' },
    actor_pool: [
      'Anthony Hopkins', 'Gary Oldman', 'Daniel Craig', 'Tom Hardy', 'Idris Elba',
      'Benedict Cumberbatch', 'Jude Law', 'Colin Firth', 'Ralph Fiennes',
      'Michael Fassbender', 'James McAvoy', 'Andrew Garfield', 'Christian Bale',
      'Cate Blanchett', 'Nicole Kidman', 'Rachel Weisz', 'Emily Blunt',
      'Russell Crowe', 'Geoffrey Rush', 'Hugo Weaving', 'Guy Pearce',
      'Javier Bardem', 'Penélope Cruz', 'Antonio Banderas', 'Gael García Bernal',
      'Mads Mikkelsen', 'Viggo Mortensen', 'Alexander Skarsgård',
      'Ryan Reynolds', 'Rachel McAdams', 'Ryan Gosling', 'Mike Myers', 'Jim Carrey',
      'Martin Short', 'Dan Aykroyd', 'Martin Freeman', 'Ricky Gervais', 'Steve Coogan',
      'Simon Pegg', 'Nick Frost', 'Rowan Atkinson', 'Hugh Laurie', 'Stephen Fry',
      'Liam Neeson', 'Brendan Gleeson', 'Colin Farrell', 'Cillian Murphy',
    ],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 16
  {
    id: 'trekverse-parks-rec',
    label: 'Casting Challenge',
    headline: 'Recast Parks & Recreation — Star Trek actors only',
    teaser: 'Recast Parks & Recreation.\nBut Star Trek actors only.',
    description: 'The Parks Department of Pawnee, Indiana, staffed across sixty years of the Trek universe. Patrick Stewart IS Ron Swanson. This is not a debate. Every role from TOS to Starfleet Academy.',
    badge: '🏛️',
    movie_slug: 'parks-and-recreation',
    actor_filter: { universe_tag: 'TrekVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 17
  {
    id: 'wireverse-curb',
    label: 'Casting Challenge',
    headline: 'Recast Curb Your Enthusiasm — The Wire cast only',
    teaser: 'Recast Curb Your Enthusiasm.\nBut The Wire cast only.',
    description: 'Larry David navigating Los Angeles, surrounded entirely by the cast of The Wire. The social faux pas are the same. The consequences are significantly higher. Omar is not having it.',
    badge: '😬',
    movie_slug: 'curb-your-enthusiasm',
    actor_filter: { universe_tag: 'WireVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 18
  {
    id: 'american-doctor-who',
    label: 'Casting Challenge',
    headline: 'Recast Doctor Who — American actors only',
    teaser: 'Recast Doctor Who.\nBut American actors only.',
    description: 'The TARDIS has landed in the wrong country. Every role — the Doctor, the companions, the villains — must be filled by an American actor. The British are not ready for this.',
    badge: '🇺🇸',
    movie_slug: 'doctor-who',
    actor_filter: { nationality: 'united states' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 19
  {
    id: 'snl-good-place',
    label: 'Casting Challenge',
    headline: 'Recast The Good Place — SNL alumni only',
    teaser: 'Recast The Good Place.\nBut SNL alumni only.',
    description: 'The afterlife has a writers\' room. Eleanor, Chidi, Tahani, Jason, Michael, and Janet — every soul in the neighbourhood must be a current or former Saturday Night Live cast member. Is this the Good Place or Studio 8H? Yes.',
    badge: '😇',
    movie_slug: 'the-good-place',
    actor_filter: { universe_tag: 'SNLVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
  // 20
  {
    id: 'tolkienverse-andor',
    label: 'Casting Challenge',
    headline: 'Recast Andor — Lord of the Rings actors only',
    teaser: 'Recast Andor.\nBut Lord of the Rings actors only.',
    description: 'The quiet Rebellion, built from Middle-Earth. Every role in Andor must be filled by an actor from the Lord of the Rings, The Hobbit, or The Rings of Power. Cassian Andor has seen darker things than Mordor. Barely.',
    badge: '🔮',
    movie_slug: 'andor',
    actor_filter: { universe_tag: 'TolkienVerse' },
    actor_pool: [],
    active: true,
    starts: '2026-04-07',
    ends: '2026-12-31',
  },
]

export function getChallenges(): Challenge[] {
  return CHALLENGES
}

export function getActiveChallenge(): Challenge | null {
  return CHALLENGES.find(c => c.active) ?? null
}

export function getChallenge(id: string): Challenge | null {
  return CHALLENGES.find(c => c.id === id) ?? null
}
