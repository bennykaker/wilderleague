'use client'
import {useMemo, useRef, useState} from 'react'
import {CastingTip,TipsToggle} from './CastingTips'
import ActorPortrait, {featuredActors} from './ActorPortrait'
import type {LibraryTitle} from '../../lib/tester/model'

const formats = {
  movie: {label:'Cast a movie', plural:'movies', question:'Which movie?', hint:'Search by movie title', suggestions:['The Matrix','Back to the Future','Jurassic Park']},
  book: {label:'Cast a book', plural:'books', question:'Which book?', hint:'Search by book title, author or series', suggestions:['Fourth Wing','Guards! Guards!','Pride and Prejudice']},
  tv: {label:'TV shows', plural:'TV shows', question:'Which show?', hint:'Search by show title', suggestions:['Breaking Bad','The Wire','Succession']},
  universe: {label:'Universes', plural:'universes', question:'Which universe?', hint:'Search by universe or author', suggestions:['Harry Potter','Discworld','Middle-earth']},
  all: {label:'All titles', plural:'titles', question:'Which title?', hint:'Search by title, author or universe', suggestions:['The Matrix','Fourth Wing','Discworld']},
}
type Format = keyof typeof formats
export type PickerState = {format:Format; query:string; shelf:string; browse:boolean; page:number}
export const initialPicker:PickerState = {format:'movie',query:'',shelf:'',browse:false,page:0}
export type PickerControls = {selection:PickerState; onChange:(next:PickerState)=>void}
const shelves = ['BookTok','Romantasy','Classics','Bestsellers','Fantasy']
const pageSize = 12
const posterPaths:Record<string,string> = {
  'the-matrix':'p96dm7sCMn4VYAStA6siNz30G1r.jpg',
  'back-to-the-future':'vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg',
  'jurassic-park':'maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg',
}
const typeNames:Record<string,string> = {movie:'Movie',film:'Movie',book:'Book',universe:'Universe',tv:'TV series',play:'Play',musical:'Musical'}
const normalize = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()

function TitleArt({item}:{item:LibraryTitle}) {
  const [failed,setFailed] = useState(false)
  const poster = posterPaths[item.slug]
  return <span className={'title-art '+(item.type==='book'?'cloth-cover':'film-cover')} aria-hidden="true">
    <span>{item.title}</span>
    {poster && !failed && <img src={'https://image.tmdb.org/t/p/w154/'+poster} alt="" onError={()=>setFailed(true)}/>}
  </span>
}

export default function CastingLibrary({titles,busy,open,selection,onChange,headingLevel=1,showTips=true,loading=false,error='',retry}:PickerControls & {
  titles:LibraryTitle[]; busy:boolean; headingLevel?:1|2; showTips?:boolean; open:(slug:string)=>void; loading?:boolean; error?:string; retry?:()=>void
}) {
  const Heading=headingLevel===1?'h1':'h2'
  const Subheading=headingLevel===1?'h2':'h3'
  const {format,query,shelf,browse,page} = selection
  const config = formats[format]
  const [formatChosen,setFormatChosen]=useState(false)
  const search = useRef<HTMLInputElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const index = useMemo(()=>titles.map(item=>({
    item, name:normalize(item.title),
    text:normalize([item.title,item.author,item.universe,item.shelf,item.year,item.keywords].filter(Boolean).join(' ')),
  })),[titles])
  const term = normalize(query)
  const matches = useMemo(()=>{
    const words = term.split(' ').filter(Boolean)
    return index.filter(({item,text})=>
      (format==='all' || (item.type==='film'?'movie':item.type)===format) &&
      (format!=='book' || !shelf || item.shelf===shelf) &&
      words.every(word=>text.includes(word))
    ).map(({item,name})=>({
      item, rank:!term||name===term?0:name.startsWith(term)?1:name.includes(term)?2:words.every(word=>name.includes(word))?3:4,
    })).sort((a,b)=>a.rank-b.rank || a.item.title.localeCompare(b.item.title)).map(row=>row.item)
  },[index,term,shelf,format])
  const showingResults = !!query.trim() || !!shelf || browse
  const start = page*pageSize
  const picks = config.suggestions.map(name=>matches.find(t=>t.title===name)).filter((t):t is LibraryTitle=>!!t)
  const visible = showingResults ? matches.slice(start,start+pageSize) : [...new Set([...picks,...matches])].slice(0,3)

  function changeFormat(next:Format) {
    setFormatChosen(true)
    onChange({...initialPicker,format:next,query})
    search.current?.focus({preventScroll:true})
  }

  return <section className="casting-library" aria-labelledby="library-heading">
    <div className="library-title-row"><Heading id="library-heading">What are you casting?</Heading><TipsToggle/></div>
    {showTips && (showingResults && visible.length>0 && !loading && !error
      ? <CastingTip key={visible[0].slug} target="title" heading="Open a title." message="Pick a title from the results to see its roles." prefer="below"/>
      : formatChosen || showingResults
      ? <CastingTip target="search" heading="Find your story." message="Type a title here, or choose a suggestion below."/>
      : <CastingTip target="format" heading="Movie or book?" message="Pick what you want to cast." prefer="right"/>)}
    <div className="primary-formats" data-casting-tip="format" role="group" aria-label="Choose a casting format">
      {(['movie','book'] as const).map(key=><button key={key} type="button" aria-pressed={format===key} onClick={()=>changeFormat(key)}>{formats[key].label}</button>)}
    </div>
    <form className="title-search" role="search" onSubmit={e=>{e.preventDefault();results.current?.querySelector('button')?.focus()}}>
      <div className="title-query"><label htmlFor="library-search">{config.question}</label>
        <div className="query-field"><span className="magnifier" aria-hidden="true"/>
          <input ref={search} data-casting-tip="search" id="library-search" type="search" placeholder={config.hint} value={query} onFocus={()=>setFormatChosen(true)} onChange={e=>onChange({...selection,query:e.target.value,page:0})}/>
        </div>
      </div>
      {format==='book'&&<label className="shelf-select">Shelf<select value={shelf} onChange={e=>onChange({...selection,shelf:e.target.value,page:0})}>
        <option value="">All shelves</option>{shelves.map(s=><option key={s}>{s}</option>)}
      </select></label>}
    </form>
    {loading || error ? <div className="title-status" role="status">{error || 'Loading titles…'} {error&&<button onClick={retry}>Try again</button>}</div> :
      <>
        <div className="results-heading">
          <Subheading aria-live="polite">{showingResults ? matches.length+' '+(matches.length===1?'title':'titles') : 'Suggested '+config.plural}</Subheading>
          {!showingResults&&matches.length>visible.length&&<button className="text-link" onClick={()=>onChange({...selection,browse:true,page:0})}>Browse all {config.plural}</button>}
          {showingResults&&<button className="text-link" onClick={()=>{onChange({...initialPicker,format});search.current?.focus()}}>Back to suggestions</button>}
        </div>
        {visible.length ? <div className={'book-results'+(showingResults?'':' suggested-titles')} ref={results}>{visible.map((t,i)=><button data-casting-tip={i===0?'title':undefined} type="button" key={t.slug} disabled={busy} onClick={()=>open(t.slug)}>
          {!showingResults&&<TitleArt item={t}/>}
          <span className="title-info"><strong>{t.title}</strong><small>{[t.author || typeNames[t.type] || t.type,t.year,t.type==='universe'&&t.bookCount?t.bookCount+' books':null].filter(Boolean).join(' · ')}</small></span>
        </button>)}</div> : <p className="title-status" role="status">No matches. Try another {format==='book'?'title or author':format==='universe'?'universe or author':'title'}{shelf?' or choose another shelf':''}.</p>}
        {showingResults&&matches.length>pageSize&&<div className="pagination">
          <button disabled={!page} onClick={()=>onChange({...selection,page:page-1})}>Previous titles</button>
          <span>Page {page+1} of {Math.ceil(matches.length/pageSize)}</span>
          <button disabled={start+pageSize>=matches.length} onClick={()=>onChange({...selection,page:page+1})}>Next titles</button>
        </div>}
      </>}
    {!showingResults&&<section className="featured-actors" aria-labelledby="featured-actors-heading">
      <Subheading id="featured-actors-heading">Actors you can cast</Subheading>
      <div>{featuredActors.map(name=><figure key={name}>
        <ActorPortrait name={name} className="featured-headshot" eager/><figcaption>{name}</figcaption>
      </figure>)}</div>
    </section>}
    <div className="other-formats" role="group" aria-label="More casting formats">
      {(['tv','universe','all'] as const).map(key=><button className="text-link" key={key} aria-pressed={format===key} onClick={()=>changeFormat(key)}>{formats[key].label}</button>)}
    </div>
  </section>
}
