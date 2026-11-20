import booktok from '../../data/book-casting/booktok.json'
import bestsellers from '../../data/book-casting/bestsellers.json'
import classics from '../../data/book-casting/classics.json'
import characterDescriptions from '../../data/book-casting/character-descriptions.json'
import expansion from '../../data/book-casting/expansion.json'
import worlds from '../../data/book-casting/worlds.json'
import type {Challenge, LibraryTitle, TesterRole} from './model'
import {rebootRule} from './reboot'

type Book = {title:string; author:string; shelf:string; universe?:string; characters:string[]; source:string}
const descriptionsByBook: Readonly<Record<string, Readonly<Record<string, string>>>> = characterDescriptions
const books: Book[] = [...booktok, ...bestsellers, ...classics, ...worlds, ...expansion]
const slugPart = (text:string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const bookSlug = (book:Book) => 'book-' + slugPart(book.author + '-' + book.title)
const universeSlug = (name:string) => 'universe-' + slugPart(name)
const byBook = new Map(books.map(book => [bookSlug(book), book]))
const universes = new Map<string, Book[]>()
for (const book of books) {
  if (!book.universe) continue
  const slug = universeSlug(book.universe)
  const members = universes.get(slug) ?? []
  members.push(book)
  universes.set(slug, members)
}
const universeKeywords:Record<string,string> = {
  'Middle-earth':'The Lord of the Rings LOTR Hobbit Tolkien Middle Earth',
  'Discworld':'Terry Pratchett Ankh-Morpork Discworld',
  'Harry Potter':'Wizarding World Hogwarts Harry Potter',
}
const getNames = (members:Book[]) => [...new Set(members.flatMap(book => book.characters))]
export const literaryTitles: LibraryTitle[] = [
  ...books.map(book => ({
    slug:bookSlug(book), title:book.title, type:'book', year:null, author:book.author,
    shelf:book.shelf, universe:book.universe, roleCount:book.characters.length,
    keywords:book.title.includes('Philosopher')?'Sorcerer’s Stone Sorcerers Stone':'',
  })),
  ...Array.from(universes).filter(([,members])=>members.length>1).map(([slug, members]) => ({
    slug, title:members[0].universe!, type:'universe', year:null,
    author:[...new Set(members.map(book => book.author))].join(', '), bookCount:members.length,
    roleCount:getNames(members).length, keywords:universeKeywords[members[0].universe!] || '',
  })),
]

export function literaryChallenge(slug:string):Challenge|undefined {
  const book = byBook.get(slug)
  const members = book ? [book] : universes.get(slug)
  if (!members || !book && members.length===1) return
  const world = members[0].universe
  const worldSlug = world ? universeSlug(world) : undefined
  const hasSeveralBooks = !!worldSlug && (universes.get(worldSlug)?.length ?? 0)>1
  const title = book?.title ?? members[0].universe!
  const roles:TesterRole[] = getNames(members).map(name => {
    const appearances = book ? [] : members.filter(b => b.characters.includes(name)).map(b => b.title)
    return {
      id:'character-' + slugPart(name), name, originalActor:'',
      description: appearances.length ? 'In ' + appearances.slice(0,3).join(' · ') + (appearances.length>3 ? ' and ' + (appearances.length-3) + ' more.' : '.') : descriptionsByBook[slug]?.[name] ?? '',
    }
  })
  return {
    id:'free:'+slug, title, season:book ? book.author + ' · ' + book.shelf : members.length + ' books · Universe',
    pool:'all', source:book?.source || '', rule:rebootRule+' Use each actor once.', roles,
    literary:{kind:book?'book':'universe', universe:world, universeSlug:hasSeveralBooks?worldSlug:undefined,
      books:book?undefined:members.map(b=>({title:b.title,slug:bookSlug(b),source:b.source}))},
  }
}

export function mergeLibrary(titles:LibraryTitle[]):LibraryTitle[] {
  const canonical = new Set(books.map(b => slugPart(b.title)))
  return [...literaryTitles, ...titles.filter(t => t.type!=='book'||!canonical.has(slugPart(t.title)))]
}
