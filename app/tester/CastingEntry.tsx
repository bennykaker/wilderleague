'use client'
import {useEffect, useMemo, useRef, useState} from 'react'
import type {Catalogue,Challenge,LibraryTitle} from '../../lib/tester/model'
import CastingLibrary, {initialPicker} from './CastingLibrary'
import TesterApp from './TesterApp'
import CastingTutorial from './CastingTutorial'
import ActorPortrait from './ActorPortrait'
import {CastingTip,CastingTipsProvider} from './CastingTips'
import {literaryTitles} from '../../lib/tester/books'
import {starterCatalogue} from '../../lib/tester/starter-catalogue'
import {useCastingResource} from './useCastingResource'
import './tester.css'
import './bookshelf.css'
import './splash.css'
import './casting-tips.css'

type Room = 'library'|'guided'
type Screen = 'starting'|'welcome'|'tutorial'|'room'
const hideSplashKey = 'wilderleague:hide-splash'

const welcomeCast = [
  {actor:'Will Sasso', role:'Ron Swanson', photo:'4F8p9Dg32WJl12ras7CzQzLFy2i'},
  {actor:'Tatiana Maslany', role:'Leslie Knope', photo:'x8lBkm9CBJbIlLpqjEwkQydZ2or'},
  {actor:'Ryan Gosling', role:'Sam Vimes', photo:'k50021gkK92Lx6m99pBy6FUOvNf'},
  {actor:'Theo James', role:'Rhysand', photo:'lSC4cMhcQeCjPFkK6qCjSGDSeR3'},
]

function readDirectory(body:unknown) {
  const directory=body as Catalogue
  if (!directory?.actors?.length || !directory.challenges?.length || !directory.pools) throw new Error()
  return directory
}
function readTitles(body:unknown):LibraryTitle[] {
  const data=body as {titles:LibraryTitle[]}
  if (!Array.isArray(data?.titles)) throw new Error()
  return data.titles
}
function readRosters(body:unknown):Challenge[] {
  const data=body as {challenges:Challenge[]}
  if (!Array.isArray(data?.challenges) || !data.challenges.length) throw new Error()
  return data.challenges
}

type EntryProps = {publicMode:boolean; embeddedCatalogue?:Catalogue}
export default function CastingEntry(props:EntryProps) {
  return <CastingTipsProvider><CastingExperience {...props}/></CastingTipsProvider>
}

function CastingExperience({publicMode,embeddedCatalogue}:EntryProps) {
  const [screen,setScreen] = useState<Screen>('starting')
  const [hideSplash,setHideSplash] = useState(false)
  const [atTitlePicker,setAtTitlePicker] = useState(false)
  const splash = useRef<HTMLElement>(null)
  const [roomTutorial,setRoomTutorial] = useState(false)
  const returnScroll=useRef(0)
  const [mode,setMode] = useState<Room>('library')
  const [selection,setSelection] = useState(initialPicker)
  const [initialTitle,setInitialTitle] = useState('')
  const titleIndex=useCastingResource('/api/preview/titles',!embeddedCatalogue && (screen==='welcome'||screen==='room'),readTitles)
  const directory=useCastingResource('/api/preview/actor-directory',!embeddedCatalogue && screen==='room',readDirectory,90000)
  const features=useCastingResource('/api/preview/challenge-rosters',!embeddedCatalogue && screen==='room' && !!directory.value,readRosters)
  const partial=!embeddedCatalogue && !directory.value
  const data=useMemo(()=>{
    if (embeddedCatalogue) return embeddedCatalogue
    const base=directory.value || starterCatalogue
    const challenges=features.value?.filter(c=>base.challenges.some(core=>core.id===c.id)||(base.pools[c.id]?.length??0)>=c.roles.length) || base.challenges
    return {...base,challenges,titles:titleIndex.value || literaryTitles}
  },[embeddedCatalogue,directory.value,features.value,titleIndex.value])
  const localShelf=selection.format==='book'||selection.format==='universe'||selection.format==='all'
  const waitingForTitles=!embeddedCatalogue && !titleIndex.value && !localShelf
  const picker={selection,onChange:setSelection,loading:waitingForTitles && !titleIndex.failed,
    error:waitingForTitles && titleIndex.failed?'The screen titles could not load. You can still cast a book or universe.':'',retry:titleIndex.retry}

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let skip = false
    try {
      skip = localStorage.getItem(hideSplashKey)==='yes'
    } catch {}
    setHideSplash(skip)
    if (params.get('cast') || params.get('title') || params.get('board')) {
      setScreen('room')
    } else if (params.get('tutorial')==='1') {
      setScreen('tutorial')
    } else if (skip && params.get('landing')!=='1') {
      setScreen('room')
    } else {
      setScreen('welcome')
    }
  },[])

  useEffect(()=>{
    const heading=splash.current?.querySelector('#library-heading')
    if (screen!=='welcome' || !heading) return
    const observer=new IntersectionObserver(([entry])=>{
      setAtTitlePicker(entry.boundingClientRect.top<(entry.rootBounds?.bottom ?? window.innerHeight))
    },{rootMargin:'0px 0px -12% 0px'})
    observer.observe(heading)
    return ()=>observer.disconnect()
  },[screen])

  function enter(room:Room,slug='') {
    if (new URLSearchParams(location.search).get('tutorial')==='1') history.replaceState(null,'',location.pathname)
    setInitialTitle(slug)
    setMode(room)
    setScreen('room')
    window.scrollTo(0,0)
  }

  function howTo() {
    setInitialTitle('')
    if (location.search) history.replaceState(null,'',location.pathname)
    setScreen('tutorial')
    window.scrollTo(0,0)
  }

  function selectPath(path:'new'|'expert',slug='') {
    try {
      if (hideSplash) localStorage.setItem(hideSplashKey,'yes')
      else localStorage.removeItem(hideSplashKey)
    } catch {}
    if (path==='new') {
      howTo()
    } else {
      enter('library',slug)
    }
  }

  if (screen==='starting') return <div className="splash-boot" aria-label="Opening WilderLeague" aria-busy="true"/>
  if (screen==='welcome') return <div className="tester wl-splash">
    <main className="splash-layout" ref={splash}>
      <section className="welcome-feature" aria-labelledby="welcome-title">
        <div className="welcome-story">
          <div className="welcome-balloon">
            <h1 id="welcome-title"><span>Welcome to </span>Wilder League.</h1>
            <a className="welcome-jump" href="#library-heading">Pick a title <span aria-hidden="true">↓</span></a>
            <p className="welcome-lede">This is a game. It is for film and book nerds.</p>
            <div className="welcome-copy">
              <p>The idea is that you pick an old movie and recast it with actors you think could do a better job.</p>
              <p>Or maybe do a recast with constraints, like recasting <em>Parks &amp; Rec</em> with Canadian actors (Will Sasso as Ron Swanson? Tatiana Maslany as Leslie Knope?). Or recast <em>The West Wing</em> with actors from the Chuck Lorre Cinematic Universe.</p>
              <p>For the book nerds, you can cast that novel with actors. Ryan Gosling as Sam Vimes from <em>Guards! Guards!</em>? Is Theo James as Rhysand just too obvious?</p>
              <p>Pick the cast, get the AI to review, post it on your favourite feed, and then submit it to our high score list (decided by <strong>Big Pudding</strong>, our in-house AI, and then by member voting).</p>
            </div>
          </div>
          <div className="splash-paths" role="group" aria-label="Welcome options">
            {!atTitlePicker&&<CastingTip target="entry" heading="Ready to cast?" message="Take the quick tutorial or go straight to the casting room." prefer="right"/>}
            <div className="splash-choices" data-casting-tip="entry">
              <button className="splash-new" onClick={()=>selectPath('new')}>New here<small>Take the quick tutorial</small></button>
              <button className="splash-expert" onClick={()=>selectPath('expert')}>Expert Caster<small>Enter the casting room</small></button>
            </div>
            <label className="splash-preference"><input type="checkbox" checked={hideSplash} onChange={e=>setHideSplash(e.target.checked)}/>Don’t show this to me again</label>
          </div>
        </div>
        <div className="welcome-portraits" role="group" aria-label="Possible casting choices">
          {welcomeCast.map(({actor,role,photo})=><figure key={actor}>
            <ActorPortrait name={actor} src={'/actor-portraits/'+photo+'.webp'} className="welcome-photo" eager/>
            <figcaption><strong>{actor}</strong><span>as {role}?</span></figcaption>
          </figure>)}
        </div>
      </section>
      <CastingLibrary {...picker} headingLevel={2} showTips={atTitlePicker} titles={data.titles||[]} busy={false} open={slug=>selectPath('expert',slug)}/>
    </main>
  </div>

  if (screen==='tutorial') return <CastingTutorial exitText="Start casting" onExit={()=>enter('library')}
    onWelcome={()=>setScreen('welcome')} onGuided={()=>enter('guided')}/>
  if (screen==='room' && (mode==='library'||!partial)) return <>
    <div hidden={roomTutorial}><TesterApp data={data} publicMode={publicMode}
      initialMode={mode} initialTitle={initialTitle} preferBundledPhotos={!!embeddedCatalogue} partialCatalogue={partial}
      directoryFailed={directory.failed} retryDirectory={directory.retry} picker={picker} onRoomChange={setMode}
      onTutorial={()=>{returnScroll.current=window.scrollY;setRoomTutorial(true);window.scrollTo(0,0)}}
      retryFeatures={features.failed?features.retry:undefined}/></div>
    {roomTutorial&&<CastingTutorial exitText="Return to casting" onExit={()=>{
      setRoomTutorial(false)
      requestAnimationFrame(()=>{
        document.getElementById('open-casting-tutorial')?.focus({preventScroll:true})
        window.scrollTo(0,returnScroll.current)
      })
    }}/>}
  </>
  return <div className="tester book-entry">
    <header><button className="brand plain" onClick={()=>setScreen('welcome')}>WilderLeague</button></header>
    <main><section className="quick-lesson" aria-live="polite"><h1>Guided casting</h1><p>{directory.failed?'The full actor list could not load.':'Loading actors for your guided challenge…'}</p>
      {directory.failed&&<button className="primary" onClick={directory.retry}>Try again</button>} <button onClick={()=>enter('library')}>Open the casting room</button> <button className="plain" onClick={()=>setScreen('welcome')}>Back to welcome</button>
    </section></main>
  </div>
}
