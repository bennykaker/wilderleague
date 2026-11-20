'use client'
import {useEffect, useMemo, useRef, useState} from 'react'
import type {Catalogue,Challenge,LibraryTitle} from '../../lib/tester/model'
import CastingLibrary, {initialPicker} from './CastingLibrary'
import TesterApp from './TesterApp'
import {literaryTitles} from '../../lib/tester/books'
import {starterCatalogue} from '../../lib/tester/starter-catalogue'
import {useCastingResource} from './useCastingResource'
import './tester.css'
import './bookshelf.css'
import './splash.css'

type Room = 'library'|'guided'
type Screen = 'starting'|'welcome'|'tutorial'|'room'
const hideSplashKey = 'wilderleague:hide-splash'

const lessons = [
  {title:'Pick a story.', text:'Pick a movie or a book. Search for the title you have in mind, or choose one of the suggestions.', label:'Title', example:'The Fellowship of the Ring'},
  {title:'Put a face to the name.', text:'Select a character. Drag a living actor’s headshot into the outlined slot for that role. Actors of any gender can play the part.', label:'Role', example:'Gandalf'},
  {title:'Make your case.', text:'Add a line about your choices. Sign in to save a private cast or share a link. A book or universe cast can start with a single role.', label:'Your pitch', example:'“I want a Gandalf who seems delighted by hobbits.”'},
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

export default function CastingEntry({publicMode,embeddedCatalogue}:{publicMode:boolean;embeddedCatalogue?:Catalogue}) {
  const [screen,setScreen] = useState<Screen>('starting')
  const [hideSplash,setHideSplash] = useState(false)
  const [lesson,setLesson] = useState(0)
  const [mode,setMode] = useState<Room>('library')
  const [selection,setSelection] = useState(initialPicker)
  const [initialTitle,setInitialTitle] = useState('')
  const titleIndex=useCastingResource('/api/preview/titles',!embeddedCatalogue && (screen==='welcome'||screen==='room'),readTitles)
  const directory=useCastingResource('/api/preview/actor-directory',!embeddedCatalogue && screen==='room',readDirectory)
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
  const lessonTitle = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let skip = false
    try {
      skip = localStorage.getItem(hideSplashKey)==='yes'
    } catch {}
    setHideSplash(skip)
    if (params.get('cast') || params.get('title')) {
      setScreen('room')
    } else if (skip && params.get('landing')!=='1') {
      setScreen('room')
    } else {
      setScreen('welcome')
    }
  },[])

  useEffect(() => {
    if (screen==='tutorial') lessonTitle.current?.focus({preventScroll:true})
  },[screen,lesson])

  function enter(room:Room,slug='') {
    setInitialTitle(slug)
    setMode(room)
    setScreen('room')
    window.scrollTo(0,0)
  }

  function howTo() {
    setInitialTitle('')
    if (location.search) history.replaceState(null,'',location.pathname)
    setLesson(0)
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
    <main className="splash-layout">
      <p className="classic-brand">WilderLeague</p>
      <CastingLibrary {...picker} titles={data.titles||[]} busy={false} open={slug=>selectPath('expert',slug)}/>
      <aside className="splash-paths" aria-label="Welcome options">
        <div className="splash-choices">
          <button className="splash-new" onClick={()=>selectPath('new')}>New here<small>Take the quick tutorial</small></button>
          <button className="splash-expert" onClick={()=>selectPath('expert')}>Expert Caster<small>Enter the casting room</small></button>
        </div>
        <label className="splash-preference"><input type="checkbox" checked={hideSplash} onChange={e=>setHideSplash(e.target.checked)}/>Don’t show this to me again</label>
      </aside>
    </main>
  </div>

  if (screen==='room' && (mode==='library'||!partial)) return <TesterApp data={data} publicMode={publicMode}
    initialMode={mode} initialTitle={initialTitle} preferBundledPhotos={!!embeddedCatalogue} partialCatalogue={partial}
    directoryFailed={directory.failed} retryDirectory={directory.retry} picker={picker} onTutorial={howTo} onRoomChange={setMode}
    retryFeatures={features.failed?features.retry:undefined}/>
  return <div className="tester book-entry">
    <header><button className="brand plain" onClick={()=>setScreen('welcome')}>WilderLeague</button>{screen==='tutorial'&&<button className="plain" onClick={()=>enter('library')}>Skip tutorial</button>}</header>
    <main>{screen==='tutorial'?<section className="quick-lesson" aria-labelledby="lesson-heading">
      <div className="lesson-progress" aria-hidden="true">{lessons.map((step,i)=><span key={step.title} className={i<=lesson?'done':''}/>)}</div>
      <p className="lesson-count">Quick tutorial · {lesson+1} of {lessons.length}</p>
      <div aria-live="polite"><h1 id="lesson-heading" ref={lessonTitle} tabIndex={-1}>{lessons[lesson].title}</h1><p>{lessons[lesson].text}</p>
        <div className="example-choice"><small>{lessons[lesson].label}</small><strong>{lessons[lesson].example}</strong></div>
      </div>
      <div className="actions">
        <button onClick={()=>lesson?setLesson(lesson-1):setScreen('welcome')}>Back</button>
        {lesson<2?<button className="primary" onClick={()=>setLesson(lesson+1)}>Next</button>:<><button className="primary" onClick={()=>enter('library')}>Start casting</button><button onClick={()=>enter('guided')}>Try a guided challenge</button></>}
      </div>
    </section>:<section className="quick-lesson" aria-live="polite"><h1>Guided casting</h1><p>{directory.failed?'The full actor list could not load.':'Loading actors for your guided challenge…'}</p>
      {directory.failed&&<button className="primary" onClick={directory.retry}>Try again</button>} <button onClick={()=>enter('library')}>Open the casting room</button> <button className="plain" onClick={()=>setScreen('welcome')}>Back to welcome</button>
    </section>}</main>
  </div>
}
