'use client'
import {useMemo,useState} from 'react'
import ChallengePosters from './ChallengePosters'
import type {LibraryTitle} from '../../lib/tester/model'

const formats = [['book','Books'],['universe','Universes'],['movie','Films'],['tv','Shows'],['all','All titles']]
const shelves = ['BookTok','Romantasy','Classics','Bestsellers','Fantasy']
const featureNames = ['Harry Potter','Discworld','Middle-earth']
const normalize = (s:string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim()

export default function CastingLibrary({titles,busy,open,challengeIds,onChallenge}:{titles:LibraryTitle[];busy:boolean;open:(slug:string)=>void;challengeIds:string[];onChallenge:(id:string)=>void}) {
 const [format,setFormat] = useState('book')
 const [shelf,setShelf] = useState('')
 const [query,setQuery] = useState('')
 const [page,setPage] = useState(0)
 const matches = useMemo(()=>{
   const terms=normalize(query).split(' ').filter(Boolean)
   return titles.filter(t=>{
     if (format!=='all' && t.type!==format || format==='book' && shelf && t.shelf!==shelf) return false
     const haystack=normalize([t.title,t.author,t.universe,t.shelf,t.keywords].filter(Boolean).join(' '))
     return terms.every(term=>haystack.includes(term))
   }).sort((a,b)=>a.title.localeCompare(b.title))
 },[titles,query,shelf,format])
 const featured = featureNames.map(name=>titles.find(t=>t.type==='universe' && t.title===name)).filter((t):t is LibraryTitle=>!!t)
 const size=18, start=page*size
 return <section className="casting-library" aria-labelledby="library-heading">
   <h1 id="library-heading">The casting room</h1>
   <div className="classic-feature-row"><section className="classic-film-shelf"><h2>Casting challenges</h2><ChallengePosters available={challengeIds} onCast={onChallenge}/></section><section className="classic-book-shelf">
   <div className="universe-heading"><h2>Cast a whole universe</h2><button className="plain" onClick={()=>{setFormat('universe');setPage(0);setQuery('');document.getElementById('library-search')?.focus()}}>Browse all universes</button></div>
   <div className="world-cards">{featured.map(t=><button key={t.slug} className="world-card" disabled={busy} onClick={()=>open(t.slug)}><small>{t.author}</small><strong>{t.title}</strong><span>{t.bookCount} books · {t.roleCount} roles</span></button>)}</div>
   </section></div><h2>Find a story</h2><div className="format-options" aria-label="Format">{formats.map(([value,label])=><button key={value} aria-pressed={format===value} onClick={()=>{setFormat(value);setPage(0)}}>{label}</button>)}</div>
   <div className="library-search"><label>Search {format==='all'?'the library':formats.find(([value])=>value===format)?.[1].toLowerCase()}<input id="library-search" type="search" value={query} placeholder="Title, author or universe" onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label>{format==='book'&&<label>Shelf<select value={shelf} onChange={e=>{setShelf(e.target.value);setPage(0)}}><option value="">All shelves</option>{shelves.map(s=><option key={s}>{s}</option>)}</select></label>}</div>
   <p className="result-count" aria-live="polite">{matches.length ? `${start+1}–${Math.min(start+size,matches.length)} of ${matches.length} ${format==='universe'?'universes':'titles'}` : 'No matches. Try another title, author or shelf.'}</p>
   <div className="book-results">{matches.slice(start,start+size).map(t=><button key={t.slug} disabled={busy} onClick={()=>open(t.slug)}><span className="book-spine" aria-hidden="true"/><div><strong>{t.title}</strong><span>{t.author || (t.type==='tv'?'TV series':t.type==='movie'?'Film':'Book')}{t.year?' · '+t.year:''}</span><small>{[t.shelf || (t.type==='universe'?t.bookCount+' books':''),t.roleCount?t.roleCount+' roles':''].filter(Boolean).join(' · ')}</small></div></button>)}</div>
   {matches.length>size&&<div className="pagination"><button disabled={page===0} onClick={()=>setPage(page-1)}>Previous titles</button><span>Page {page+1} of {Math.ceil(matches.length/size)}</span><button disabled={start+size>=matches.length} onClick={()=>setPage(page+1)}>Next titles</button></div>}
 </section>
}
