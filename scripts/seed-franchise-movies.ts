/**
 * Seeds all major franchise movies into the titles table.
 * Safe to re-run — upserts on slug.
 * Run with: npx tsx scripts/seed-franchise-movies.ts
 *
 * After this: npx tsx scripts/enrich-titles.ts && npx tsx scripts/seed-new-roles.ts
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FRANCHISE_TITLES = [
  // ── Marvel Cinematic Universe ──────────────────────────────────────────────
  { slug: 'iron-man',                              title: 'Iron Man',                                                      type: 'movie', year: 2008, budget: 140 },
  { slug: 'the-incredible-hulk',                   title: 'The Incredible Hulk',                                           type: 'movie', year: 2008, budget: 150 },
  { slug: 'iron-man-2',                            title: 'Iron Man 2',                                                    type: 'movie', year: 2010, budget: 200 },
  { slug: 'thor',                                  title: 'Thor',                                                          type: 'movie', year: 2011, budget: 150 },
  { slug: 'captain-america-the-first-avenger',     title: 'Captain America: The First Avenger',                            type: 'movie', year: 2011, budget: 140 },
  { slug: 'the-avengers',                          title: 'The Avengers',                                                  type: 'movie', year: 2012, budget: 220 },
  { slug: 'iron-man-3',                            title: 'Iron Man 3',                                                    type: 'movie', year: 2013, budget: 200 },
  { slug: 'thor-the-dark-world',                   title: 'Thor: The Dark World',                                          type: 'movie', year: 2013, budget: 170 },
  { slug: 'captain-america-the-winter-soldier',    title: 'Captain America: The Winter Soldier',                           type: 'movie', year: 2014, budget: 170 },
  { slug: 'guardians-of-the-galaxy',               title: 'Guardians of the Galaxy',                                       type: 'movie', year: 2014, budget: 170 },
  { slug: 'avengers-age-of-ultron',                title: 'Avengers: Age of Ultron',                                       type: 'movie', year: 2015, budget: 250 },
  { slug: 'ant-man',                               title: 'Ant-Man',                                                       type: 'movie', year: 2015, budget: 130 },
  { slug: 'captain-america-civil-war',             title: 'Captain America: Civil War',                                    type: 'movie', year: 2016, budget: 250 },
  { slug: 'doctor-strange',                        title: 'Doctor Strange',                                                type: 'movie', year: 2016, budget: 165 },
  { slug: 'guardians-of-the-galaxy-vol-2',         title: 'Guardians of the Galaxy Vol. 2',                                type: 'movie', year: 2017, budget: 200 },
  { slug: 'spider-man-homecoming',                 title: 'Spider-Man: Homecoming',                                        type: 'movie', year: 2017, budget: 175 },
  { slug: 'thor-ragnarok',                         title: 'Thor: Ragnarok',                                                type: 'movie', year: 2017, budget: 180 },
  { slug: 'black-panther',                         title: 'Black Panther',                                                 type: 'movie', year: 2018, budget: 200 },
  { slug: 'avengers-infinity-war',                 title: 'Avengers: Infinity War',                                        type: 'movie', year: 2018, budget: 325 },
  { slug: 'ant-man-and-the-wasp',                  title: 'Ant-Man and the Wasp',                                          type: 'movie', year: 2018, budget: 130 },
  { slug: 'captain-marvel',                        title: 'Captain Marvel',                                                type: 'movie', year: 2019, budget: 175 },
  { slug: 'avengers-endgame',                      title: 'Avengers: Endgame',                                             type: 'movie', year: 2019, budget: 356 },
  { slug: 'spider-man-far-from-home',              title: 'Spider-Man: Far From Home',                                     type: 'movie', year: 2019, budget: 160 },
  { slug: 'black-widow',                           title: 'Black Widow',                                                   type: 'movie', year: 2021, budget: 200 },
  { slug: 'shang-chi',                             title: 'Shang-Chi and the Legend of the Ten Rings',                     type: 'movie', year: 2021, budget: 150 },
  { slug: 'eternals',                              title: 'Eternals',                                                      type: 'movie', year: 2021, budget: 200 },
  { slug: 'spider-man-no-way-home',                title: 'Spider-Man: No Way Home',                                       type: 'movie', year: 2021, budget: 200 },
  { slug: 'doctor-strange-multiverse-of-madness',  title: 'Doctor Strange in the Multiverse of Madness',                   type: 'movie', year: 2022, budget: 200 },
  { slug: 'thor-love-and-thunder',                 title: 'Thor: Love and Thunder',                                        type: 'movie', year: 2022, budget: 250 },
  { slug: 'black-panther-wakanda-forever',         title: 'Black Panther: Wakanda Forever',                                type: 'movie', year: 2022, budget: 250 },
  { slug: 'ant-man-quantumania',                   title: 'Ant-Man and the Wasp: Quantumania',                             type: 'movie', year: 2023, budget: 200 },
  { slug: 'guardians-of-the-galaxy-vol-3',         title: 'Guardians of the Galaxy Vol. 3',                                type: 'movie', year: 2023, budget: 250 },
  { slug: 'the-marvels',                           title: 'The Marvels',                                                   type: 'movie', year: 2023, budget: 220 },
  { slug: 'deadpool-and-wolverine',                title: 'Deadpool & Wolverine',                                          type: 'movie', year: 2024, budget: 200 },
  { slug: 'captain-america-brave-new-world',       title: 'Captain America: Brave New World',                              type: 'movie', year: 2025, budget: 180 },
  { slug: 'thunderbolts',                          title: 'Thunderbolts*',                                                 type: 'movie', year: 2025, budget: 180 },

  // ── Spider-Man (Sony / non-MCU) ────────────────────────────────────────────
  { slug: 'spider-man-2002',                       title: 'Spider-Man',                                                    type: 'movie', year: 2002, budget: 139 },
  { slug: 'spider-man-2',                          title: 'Spider-Man 2',                                                  type: 'movie', year: 2004, budget: 200 },
  { slug: 'spider-man-3',                          title: 'Spider-Man 3',                                                  type: 'movie', year: 2007, budget: 258 },
  { slug: 'the-amazing-spider-man',                title: 'The Amazing Spider-Man',                                        type: 'movie', year: 2012, budget: 230 },
  { slug: 'the-amazing-spider-man-2',              title: 'The Amazing Spider-Man 2',                                      type: 'movie', year: 2014, budget: 255 },
  { slug: 'venom',                                 title: 'Venom',                                                         type: 'movie', year: 2018, budget: 100 },
  { slug: 'spider-man-into-the-spider-verse',      title: 'Spider-Man: Into the Spider-Verse',                             type: 'movie', year: 2018, budget: 90  },
  { slug: 'venom-let-there-be-carnage',            title: 'Venom: Let There Be Carnage',                                   type: 'movie', year: 2021, budget: 200 },
  { slug: 'morbius',                               title: 'Morbius',                                                       type: 'movie', year: 2022, budget: 75  },
  { slug: 'spider-man-across-the-spider-verse',    title: 'Spider-Man: Across the Spider-Verse',                           type: 'movie', year: 2023, budget: 100 },
  { slug: 'madame-web',                            title: 'Madame Web',                                                    type: 'movie', year: 2024, budget: 80  },
  { slug: 'kraven-the-hunter',                     title: 'Kraven the Hunter',                                             type: 'movie', year: 2024, budget: 110 },

  // ── Star Wars ──────────────────────────────────────────────────────────────
  // The Empire Strikes Back already in DB
  { slug: 'star-wars-a-new-hope',                  title: 'Star Wars: A New Hope',                                         type: 'movie', year: 1977, budget: 11  },
  { slug: 'return-of-the-jedi',                    title: 'Return of the Jedi',                                            type: 'movie', year: 1983, budget: 32  },
  { slug: 'the-phantom-menace',                    title: 'Star Wars: The Phantom Menace',                                 type: 'movie', year: 1999, budget: 115 },
  { slug: 'attack-of-the-clones',                  title: 'Star Wars: Attack of the Clones',                               type: 'movie', year: 2002, budget: 115 },
  { slug: 'revenge-of-the-sith',                   title: 'Star Wars: Revenge of the Sith',                                type: 'movie', year: 2005, budget: 113 },
  { slug: 'star-wars-the-force-awakens',           title: 'Star Wars: The Force Awakens',                                  type: 'movie', year: 2015, budget: 245 },
  { slug: 'rogue-one',                             title: 'Rogue One: A Star Wars Story',                                  type: 'movie', year: 2016, budget: 200 },
  { slug: 'star-wars-the-last-jedi',               title: 'Star Wars: The Last Jedi',                                      type: 'movie', year: 2017, budget: 200 },
  { slug: 'solo-a-star-wars-story',                title: 'Solo: A Star Wars Story',                                       type: 'movie', year: 2018, budget: 275 },
  { slug: 'star-wars-the-rise-of-skywalker',       title: 'Star Wars: The Rise of Skywalker',                              type: 'movie', year: 2019, budget: 275 },

  // ── Wizarding World ────────────────────────────────────────────────────────
  { slug: 'harry-potter-sorcerers-stone',          title: "Harry Potter and the Sorcerer's Stone",                         type: 'movie', year: 2001, budget: 125 },
  { slug: 'harry-potter-chamber-of-secrets',       title: 'Harry Potter and the Chamber of Secrets',                       type: 'movie', year: 2002, budget: 100 },
  { slug: 'harry-potter-prisoner-of-azkaban',      title: 'Harry Potter and the Prisoner of Azkaban',                      type: 'movie', year: 2004, budget: 130 },
  { slug: 'harry-potter-goblet-of-fire',           title: 'Harry Potter and the Goblet of Fire',                           type: 'movie', year: 2005, budget: 150 },
  { slug: 'harry-potter-order-of-the-phoenix',     title: 'Harry Potter and the Order of the Phoenix',                     type: 'movie', year: 2007, budget: 150 },
  { slug: 'harry-potter-half-blood-prince',        title: 'Harry Potter and the Half-Blood Prince',                        type: 'movie', year: 2009, budget: 250 },
  { slug: 'harry-potter-deathly-hallows-1',        title: 'Harry Potter and the Deathly Hallows – Part 1',                 type: 'movie', year: 2010, budget: 200 },
  { slug: 'harry-potter-deathly-hallows-2',        title: 'Harry Potter and the Deathly Hallows – Part 2',                 type: 'movie', year: 2011, budget: 250 },
  { slug: 'fantastic-beasts-1',                    title: 'Fantastic Beasts and Where to Find Them',                       type: 'movie', year: 2016, budget: 180 },
  { slug: 'fantastic-beasts-crimes-of-grindelwald',title: 'Fantastic Beasts: The Crimes of Grindelwald',                   type: 'movie', year: 2018, budget: 200 },
  { slug: 'fantastic-beasts-secrets-of-dumbledore',title: 'Fantastic Beasts: The Secrets of Dumbledore',                   type: 'movie', year: 2022, budget: 200 },

  // ── James Bond ─────────────────────────────────────────────────────────────
  { slug: 'dr-no',                                 title: 'Dr. No',                                                        type: 'movie', year: 1962, budget: 1   },
  { slug: 'from-russia-with-love',                 title: 'From Russia with Love',                                         type: 'movie', year: 1963, budget: 2   },
  { slug: 'goldfinger',                            title: 'Goldfinger',                                                    type: 'movie', year: 1964, budget: 3   },
  { slug: 'thunderball',                           title: 'Thunderball',                                                   type: 'movie', year: 1965, budget: 9   },
  { slug: 'you-only-live-twice',                   title: 'You Only Live Twice',                                           type: 'movie', year: 1967, budget: 10  },
  { slug: 'on-her-majestys-secret-service',        title: "On Her Majesty's Secret Service",                               type: 'movie', year: 1969, budget: 7   },
  { slug: 'diamonds-are-forever',                  title: 'Diamonds Are Forever',                                          type: 'movie', year: 1971, budget: 7   },
  { slug: 'live-and-let-die',                      title: 'Live and Let Die',                                              type: 'movie', year: 1973, budget: 7   },
  { slug: 'the-man-with-the-golden-gun',           title: 'The Man with the Golden Gun',                                   type: 'movie', year: 1974, budget: 7   },
  { slug: 'the-spy-who-loved-me',                  title: 'The Spy Who Loved Me',                                          type: 'movie', year: 1977, budget: 14  },
  { slug: 'moonraker',                             title: 'Moonraker',                                                     type: 'movie', year: 1979, budget: 34  },
  { slug: 'for-your-eyes-only',                    title: 'For Your Eyes Only',                                            type: 'movie', year: 1981, budget: 28  },
  { slug: 'octopussy',                             title: 'Octopussy',                                                     type: 'movie', year: 1983, budget: 27  },
  { slug: 'a-view-to-a-kill',                      title: 'A View to a Kill',                                              type: 'movie', year: 1985, budget: 30  },
  { slug: 'the-living-daylights',                  title: 'The Living Daylights',                                          type: 'movie', year: 1987, budget: 40  },
  { slug: 'licence-to-kill',                       title: 'Licence to Kill',                                               type: 'movie', year: 1989, budget: 36  },
  { slug: 'goldeneye',                             title: 'GoldenEye',                                                     type: 'movie', year: 1995, budget: 60  },
  { slug: 'tomorrow-never-dies',                   title: 'Tomorrow Never Dies',                                           type: 'movie', year: 1997, budget: 110 },
  { slug: 'the-world-is-not-enough',               title: 'The World Is Not Enough',                                       type: 'movie', year: 1999, budget: 135 },
  { slug: 'die-another-day',                       title: 'Die Another Day',                                               type: 'movie', year: 2002, budget: 142 },
  { slug: 'casino-royale',                         title: 'Casino Royale',                                                 type: 'movie', year: 2006, budget: 150 },
  { slug: 'quantum-of-solace',                     title: 'Quantum of Solace',                                             type: 'movie', year: 2008, budget: 200 },
  { slug: 'skyfall',                               title: 'Skyfall',                                                       type: 'movie', year: 2012, budget: 200 },
  { slug: 'spectre',                               title: 'Spectre',                                                       type: 'movie', year: 2015, budget: 250 },
  { slug: 'no-time-to-die',                        title: 'No Time to Die',                                                type: 'movie', year: 2021, budget: 250 },

  // ── X-Men ──────────────────────────────────────────────────────────────────
  { slug: 'x-men',                                 title: 'X-Men',                                                         type: 'movie', year: 2000, budget: 75  },
  { slug: 'x2-x-men-united',                       title: 'X2: X-Men United',                                              type: 'movie', year: 2003, budget: 110 },
  { slug: 'x-men-the-last-stand',                  title: 'X-Men: The Last Stand',                                         type: 'movie', year: 2006, budget: 210 },
  { slug: 'x-men-origins-wolverine',               title: 'X-Men Origins: Wolverine',                                      type: 'movie', year: 2009, budget: 150 },
  { slug: 'x-men-first-class',                     title: 'X-Men: First Class',                                            type: 'movie', year: 2011, budget: 160 },
  { slug: 'the-wolverine',                         title: 'The Wolverine',                                                  type: 'movie', year: 2013, budget: 120 },
  { slug: 'x-men-days-of-future-past',             title: 'X-Men: Days of Future Past',                                    type: 'movie', year: 2014, budget: 200 },
  { slug: 'x-men-apocalypse',                      title: 'X-Men: Apocalypse',                                             type: 'movie', year: 2016, budget: 178 },
  { slug: 'logan',                                 title: 'Logan',                                                         type: 'movie', year: 2017, budget: 97  },
  { slug: 'deadpool',                              title: 'Deadpool',                                                      type: 'movie', year: 2016, budget: 58  },
  { slug: 'deadpool-2',                            title: 'Deadpool 2',                                                    type: 'movie', year: 2018, budget: 110 },
  { slug: 'dark-phoenix',                          title: 'Dark Phoenix',                                                  type: 'movie', year: 2019, budget: 200 },
  { slug: 'the-new-mutants',                       title: 'The New Mutants',                                               type: 'movie', year: 2020, budget: 67  },

  // ── Fast & Furious ─────────────────────────────────────────────────────────
  { slug: 'the-fast-and-the-furious',              title: 'The Fast and the Furious',                                      type: 'movie', year: 2001, budget: 38  },
  { slug: '2-fast-2-furious',                      title: '2 Fast 2 Furious',                                              type: 'movie', year: 2003, budget: 76  },
  { slug: 'fast-and-furious-tokyo-drift',           title: 'The Fast and the Furious: Tokyo Drift',                        type: 'movie', year: 2006, budget: 85  },
  { slug: 'fast-and-furious-4',                    title: 'Fast & Furious',                                                type: 'movie', year: 2009, budget: 85  },
  { slug: 'fast-five',                             title: 'Fast Five',                                                     type: 'movie', year: 2011, budget: 125 },
  { slug: 'fast-and-furious-6',                    title: 'Fast & Furious 6',                                              type: 'movie', year: 2013, budget: 160 },
  { slug: 'furious-7',                             title: 'Furious 7',                                                     type: 'movie', year: 2015, budget: 190 },
  { slug: 'the-fate-of-the-furious',               title: 'The Fate of the Furious',                                       type: 'movie', year: 2017, budget: 250 },
  { slug: 'hobbs-and-shaw',                        title: 'Fast & Furious Presents: Hobbs & Shaw',                         type: 'movie', year: 2019, budget: 200 },
  { slug: 'f9',                                    title: 'F9',                                                            type: 'movie', year: 2021, budget: 200 },
  { slug: 'fast-x',                                title: 'Fast X',                                                        type: 'movie', year: 2023, budget: 340 },

  // ── DC Extended Universe ───────────────────────────────────────────────────
  { slug: 'man-of-steel',                          title: 'Man of Steel',                                                  type: 'movie', year: 2013, budget: 225 },
  { slug: 'batman-v-superman',                     title: 'Batman v Superman: Dawn of Justice',                            type: 'movie', year: 2016, budget: 250 },
  { slug: 'suicide-squad',                         title: 'Suicide Squad',                                                 type: 'movie', year: 2016, budget: 175 },
  { slug: 'wonder-woman',                          title: 'Wonder Woman',                                                  type: 'movie', year: 2017, budget: 149 },
  { slug: 'justice-league',                        title: 'Justice League',                                                type: 'movie', year: 2017, budget: 300 },
  { slug: 'aquaman',                               title: 'Aquaman',                                                       type: 'movie', year: 2018, budget: 160 },
  { slug: 'shazam',                                title: 'Shazam!',                                                       type: 'movie', year: 2019, budget: 100 },
  { slug: 'joker',                                 title: 'Joker',                                                         type: 'movie', year: 2019, budget: 55  },
  { slug: 'birds-of-prey',                         title: 'Birds of Prey',                                                 type: 'movie', year: 2020, budget: 82  },
  { slug: 'wonder-woman-1984',                     title: 'Wonder Woman 1984',                                             type: 'movie', year: 2020, budget: 200 },
  { slug: 'the-suicide-squad',                     title: 'The Suicide Squad',                                             type: 'movie', year: 2021, budget: 185 },
  { slug: 'black-adam',                            title: 'Black Adam',                                                    type: 'movie', year: 2022, budget: 195 },
  { slug: 'shazam-fury-of-the-gods',               title: 'Shazam! Fury of the Gods',                                      type: 'movie', year: 2023, budget: 125 },
  { slug: 'aquaman-and-the-lost-kingdom',          title: 'Aquaman and the Lost Kingdom',                                  type: 'movie', year: 2023, budget: 205 },
  { slug: 'the-flash',                             title: 'The Flash',                                                     type: 'movie', year: 2023, budget: 200 },
  { slug: 'blue-beetle',                           title: 'Blue Beetle',                                                   type: 'movie', year: 2023, budget: 104 },
  { slug: 'joker-folie-a-deux',                    title: 'Joker: Folie à Deux',                                           type: 'movie', year: 2024, budget: 200 },

  // ── Batman (non-DCEU) ──────────────────────────────────────────────────────
  // The Dark Knight already in DB
  { slug: 'batman-1989',                           title: 'Batman',                                                        type: 'movie', year: 1989, budget: 35  },
  { slug: 'batman-returns',                        title: 'Batman Returns',                                                type: 'movie', year: 1992, budget: 80  },
  { slug: 'batman-forever',                        title: 'Batman Forever',                                                type: 'movie', year: 1995, budget: 100 },
  { slug: 'batman-and-robin',                      title: 'Batman & Robin',                                                type: 'movie', year: 1997, budget: 125 },
  { slug: 'batman-begins',                         title: 'Batman Begins',                                                 type: 'movie', year: 2005, budget: 150 },
  { slug: 'the-dark-knight-rises',                 title: 'The Dark Knight Rises',                                         type: 'movie', year: 2012, budget: 250 },
  { slug: 'the-batman',                            title: 'The Batman',                                                    type: 'movie', year: 2022, budget: 185 },

  // ── Jurassic Park/World ────────────────────────────────────────────────────
  // Jurassic Park (1993) already in DB
  { slug: 'the-lost-world-jurassic-park',          title: 'The Lost World: Jurassic Park',                                 type: 'movie', year: 1997, budget: 73  },
  { slug: 'jurassic-park-iii',                     title: 'Jurassic Park III',                                             type: 'movie', year: 2001, budget: 93  },
  { slug: 'jurassic-world',                        title: 'Jurassic World',                                                type: 'movie', year: 2015, budget: 150 },
  { slug: 'jurassic-world-fallen-kingdom',         title: 'Jurassic World: Fallen Kingdom',                                type: 'movie', year: 2018, budget: 170 },
  { slug: 'jurassic-world-dominion',               title: 'Jurassic World Dominion',                                       type: 'movie', year: 2022, budget: 185 },

  // ── Avatar ─────────────────────────────────────────────────────────────────
  { slug: 'avatar',                                title: 'Avatar',                                                        type: 'movie', year: 2009, budget: 237 },
  { slug: 'avatar-the-way-of-water',               title: 'Avatar: The Way of Water',                                      type: 'movie', year: 2022, budget: 350 },

  // ── Middle-earth ───────────────────────────────────────────────────────────
  // The Fellowship of the Ring already in DB
  { slug: 'the-two-towers',                        title: 'The Lord of the Rings: The Two Towers',                         type: 'movie', year: 2002, budget: 94  },
  { slug: 'the-return-of-the-king',                title: 'The Lord of the Rings: The Return of the King',                 type: 'movie', year: 2003, budget: 94  },
  { slug: 'the-hobbit-an-unexpected-journey',      title: 'The Hobbit: An Unexpected Journey',                             type: 'movie', year: 2012, budget: 180 },
  { slug: 'the-hobbit-desolation-of-smaug',        title: 'The Hobbit: The Desolation of Smaug',                           type: 'movie', year: 2013, budget: 190 },
  { slug: 'the-hobbit-battle-of-five-armies',      title: 'The Hobbit: The Battle of the Five Armies',                     type: 'movie', year: 2014, budget: 250 },

  // ── Despicable Me / Minions ────────────────────────────────────────────────
  { slug: 'despicable-me',                         title: 'Despicable Me',                                                 type: 'movie', year: 2010, budget: 69  },
  { slug: 'despicable-me-2',                       title: 'Despicable Me 2',                                               type: 'movie', year: 2013, budget: 76  },
  { slug: 'minions',                               title: 'Minions',                                                       type: 'movie', year: 2015, budget: 74  },
  { slug: 'despicable-me-3',                       title: 'Despicable Me 3',                                               type: 'movie', year: 2017, budget: 80  },
  { slug: 'minions-the-rise-of-gru',               title: 'Minions: The Rise of Gru',                                      type: 'movie', year: 2022, budget: 80  },
  { slug: 'despicable-me-4',                       title: 'Despicable Me 4',                                               type: 'movie', year: 2024, budget: 100 },

  // ── Transformers ───────────────────────────────────────────────────────────
  { slug: 'transformers',                          title: 'Transformers',                                                  type: 'movie', year: 2007, budget: 150 },
  { slug: 'transformers-revenge-of-the-fallen',    title: 'Transformers: Revenge of the Fallen',                           type: 'movie', year: 2009, budget: 200 },
  { slug: 'transformers-dark-of-the-moon',         title: 'Transformers: Dark of the Moon',                                type: 'movie', year: 2011, budget: 195 },
  { slug: 'transformers-age-of-extinction',        title: 'Transformers: Age of Extinction',                               type: 'movie', year: 2014, budget: 210 },
  { slug: 'transformers-the-last-knight',          title: 'Transformers: The Last Knight',                                 type: 'movie', year: 2017, budget: 217 },
  { slug: 'bumblebee',                             title: 'Bumblebee',                                                     type: 'movie', year: 2018, budget: 102 },
  { slug: 'transformers-rise-of-the-beasts',       title: 'Transformers: Rise of the Beasts',                              type: 'movie', year: 2023, budget: 195 },

  // ── Mission: Impossible ────────────────────────────────────────────────────
  { slug: 'mission-impossible',                    title: 'Mission: Impossible',                                           type: 'movie', year: 1996, budget: 80  },
  { slug: 'mission-impossible-2',                  title: 'Mission: Impossible 2',                                         type: 'movie', year: 2000, budget: 125 },
  { slug: 'mission-impossible-iii',                title: 'Mission: Impossible III',                                       type: 'movie', year: 2006, budget: 150 },
  { slug: 'mission-impossible-ghost-protocol',     title: 'Mission: Impossible – Ghost Protocol',                          type: 'movie', year: 2011, budget: 145 },
  { slug: 'mission-impossible-rogue-nation',       title: 'Mission: Impossible – Rogue Nation',                            type: 'movie', year: 2015, budget: 150 },
  { slug: 'mission-impossible-fallout',            title: 'Mission: Impossible – Fallout',                                 type: 'movie', year: 2018, budget: 178 },
  { slug: 'mission-impossible-dead-reckoning',     title: 'Mission: Impossible – Dead Reckoning Part One',                 type: 'movie', year: 2023, budget: 290 },
  { slug: 'mission-impossible-the-final-reckoning',title: 'Mission: Impossible – The Final Reckoning',                    type: 'movie', year: 2025, budget: 400 },

  // ── Pirates of the Caribbean ───────────────────────────────────────────────
  { slug: 'pirates-curse-of-the-black-pearl',      title: 'Pirates of the Caribbean: The Curse of the Black Pearl',        type: 'movie', year: 2003, budget: 140 },
  { slug: 'pirates-dead-mans-chest',               title: "Pirates of the Caribbean: Dead Man's Chest",                    type: 'movie', year: 2006, budget: 225 },
  { slug: 'pirates-at-worlds-end',                 title: "Pirates of the Caribbean: At World's End",                      type: 'movie', year: 2007, budget: 300 },
  { slug: 'pirates-on-stranger-tides',             title: 'Pirates of the Caribbean: On Stranger Tides',                   type: 'movie', year: 2011, budget: 379 },
  { slug: 'pirates-dead-men-tell-no-tales',        title: 'Pirates of the Caribbean: Dead Men Tell No Tales',              type: 'movie', year: 2017, budget: 230 },

  // ── Shrek ──────────────────────────────────────────────────────────────────
  { slug: 'shrek',                                 title: 'Shrek',                                                         type: 'movie', year: 2001, budget: 60  },
  { slug: 'shrek-2',                               title: 'Shrek 2',                                                       type: 'movie', year: 2004, budget: 150 },
  { slug: 'shrek-the-third',                       title: 'Shrek the Third',                                               type: 'movie', year: 2007, budget: 160 },
  { slug: 'shrek-forever-after',                   title: 'Shrek Forever After',                                           type: 'movie', year: 2010, budget: 165 },
  { slug: 'puss-in-boots',                         title: 'Puss in Boots',                                                 type: 'movie', year: 2011, budget: 130 },
  { slug: 'puss-in-boots-the-last-wish',           title: 'Puss in Boots: The Last Wish',                                  type: 'movie', year: 2022, budget: 90  },

  // ── Twilight ───────────────────────────────────────────────────────────────
  { slug: 'twilight',                              title: 'Twilight',                                                      type: 'movie', year: 2008, budget: 37  },
  { slug: 'twilight-new-moon',                     title: 'The Twilight Saga: New Moon',                                   type: 'movie', year: 2009, budget: 50  },
  { slug: 'twilight-eclipse',                      title: 'The Twilight Saga: Eclipse',                                    type: 'movie', year: 2010, budget: 68  },
  { slug: 'twilight-breaking-dawn-1',              title: 'The Twilight Saga: Breaking Dawn – Part 1',                     type: 'movie', year: 2011, budget: 127 },
  { slug: 'twilight-breaking-dawn-2',              title: 'The Twilight Saga: Breaking Dawn – Part 2',                     type: 'movie', year: 2012, budget: 120 },

  // ── The Lion King ──────────────────────────────────────────────────────────
  { slug: 'the-lion-king',                         title: 'The Lion King',                                                 type: 'movie', year: 1994, budget: 45  },
  { slug: 'the-lion-king-2019',                    title: 'The Lion King',                                                 type: 'movie', year: 2019, budget: 260 },

  // ── Toy Story ──────────────────────────────────────────────────────────────
  { slug: 'toy-story',                             title: 'Toy Story',                                                     type: 'movie', year: 1995, budget: 30  },
  { slug: 'toy-story-2',                           title: 'Toy Story 2',                                                   type: 'movie', year: 1999, budget: 90  },
  { slug: 'toy-story-3',                           title: 'Toy Story 3',                                                   type: 'movie', year: 2010, budget: 200 },
  { slug: 'toy-story-4',                           title: 'Toy Story 4',                                                   type: 'movie', year: 2019, budget: 200 },

  // ── Ice Age ────────────────────────────────────────────────────────────────
  { slug: 'ice-age',                               title: 'Ice Age',                                                       type: 'movie', year: 2002, budget: 59  },
  { slug: 'ice-age-the-meltdown',                  title: 'Ice Age: The Meltdown',                                         type: 'movie', year: 2006, budget: 80  },
  { slug: 'ice-age-dawn-of-the-dinosaurs',         title: 'Ice Age: Dawn of the Dinosaurs',                                type: 'movie', year: 2009, budget: 90  },
  { slug: 'ice-age-continental-drift',             title: 'Ice Age: Continental Drift',                                    type: 'movie', year: 2012, budget: 95  },
  { slug: 'ice-age-collision-course',              title: 'Ice Age: Collision Course',                                     type: 'movie', year: 2016, budget: 105 },

  // ── The Hunger Games (films) ───────────────────────────────────────────────
  // the-hunger-games-book already in DB as type=book; these are the movies
  { slug: 'the-hunger-games',                      title: 'The Hunger Games',                                              type: 'movie', year: 2012, budget: 78  },
  { slug: 'the-hunger-games-catching-fire',        title: 'The Hunger Games: Catching Fire',                               type: 'movie', year: 2013, budget: 130 },
  { slug: 'the-hunger-games-mockingjay-1',         title: 'The Hunger Games: Mockingjay – Part 1',                         type: 'movie', year: 2014, budget: 125 },
  { slug: 'the-hunger-games-mockingjay-2',         title: 'The Hunger Games: Mockingjay – Part 2',                         type: 'movie', year: 2015, budget: 160 },
  { slug: 'hunger-games-ballad-songbirds-snakes',  title: 'The Hunger Games: The Ballad of Songbirds & Snakes',            type: 'movie', year: 2023, budget: 100 },

  // ── Indiana Jones ──────────────────────────────────────────────────────────
  // Raiders of the Lost Ark already in DB
  { slug: 'indiana-jones-temple-of-doom',          title: 'Indiana Jones and the Temple of Doom',                          type: 'movie', year: 1984, budget: 28  },
  { slug: 'indiana-jones-last-crusade',            title: 'Indiana Jones and the Last Crusade',                            type: 'movie', year: 1989, budget: 48  },
  { slug: 'indiana-jones-crystal-skull',           title: 'Indiana Jones and the Kingdom of the Crystal Skull',            type: 'movie', year: 2008, budget: 185 },
  { slug: 'indiana-jones-dial-of-destiny',         title: 'Indiana Jones and the Dial of Destiny',                         type: 'movie', year: 2023, budget: 295 },

  // ── Madagascar ─────────────────────────────────────────────────────────────
  { slug: 'madagascar',                            title: 'Madagascar',                                                    type: 'movie', year: 2005, budget: 75  },
  { slug: 'madagascar-escape-2-africa',            title: 'Madagascar: Escape 2 Africa',                                   type: 'movie', year: 2008, budget: 150 },
  { slug: 'madagascar-3',                          title: "Madagascar 3: Europe's Most Wanted",                            type: 'movie', year: 2012, budget: 145 },
  { slug: 'penguins-of-madagascar',                title: 'Penguins of Madagascar',                                        type: 'movie', year: 2014, budget: 132 },
]

async function main() {
  // Get existing slugs to report what's new
  const { data: existing } = await supabase.from('titles').select('slug')
  const existingSlugs = new Set(existing?.map((t: any) => t.slug) ?? [])

  const newTitles = FRANCHISE_TITLES.filter(t => !existingSlugs.has(t.slug))
  const alreadyPresent = FRANCHISE_TITLES.filter(t => existingSlugs.has(t.slug))

  console.log(`${FRANCHISE_TITLES.length} franchise titles total`)
  console.log(`${alreadyPresent.length} already in DB`)
  console.log(`${newTitles.length} to add\n`)

  if (newTitles.length === 0) {
    console.log('Nothing to add — all franchise titles already present.')
    return
  }

  // Upsert in batches of 50
  const BATCH = 50
  let added = 0
  for (let i = 0; i < newTitles.length; i += BATCH) {
    const batch = newTitles.slice(i, i + BATCH)
    const { error } = await supabase.from('titles').upsert(batch, { onConflict: 'slug' })
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message)
    } else {
      added += batch.length
      console.log(`Batch ${Math.floor(i / BATCH) + 1}: ${batch.length} titles added`)
    }
  }

  console.log(`\n✓ ${added} titles seeded.`)
  console.log('\nNext steps:')
  console.log('  npx tsx scripts/enrich-titles.ts     # fills poster, logline, casting brief, reboot score')
  console.log('  npx tsx scripts/seed-new-roles.ts    # generates roles with original cast')
}

main().catch(console.error)
