'use client'
import {useEffect, useRef, useState} from 'react'
import type {Catalogue} from '../../lib/tester/model'
import TesterApp from './TesterApp'
import './tester.css'
import './bookshelf.css'
import './splash.css'

type Room = 'library'|'guided'
type Screen = 'starting'|'welcome'|'tutorial'|'room'
const hideSplashKey = 'wilderleague:hide-splash'
const lastRoomKey = 'wilderleague:opening-v1'

const lessons = [
  {title:'Pick a story.', text:'Choose a film, a show, a book, or an entire universe. Try Middle-earth if one book feels too small.', label:'Title', example:'The Fellowship of the Ring'},
  {title:'Put a face to the name.', text:'Choose a character and search for the actor you see in the role. Pick a living actor of any gender. Each actor gets one part.', label:'Role', example:'Gandalf'},
  {title:'Make your case.', text:'Add a line about your choices. Sign in to save a private cast or share a link. A book or universe cast can start with a single role.', label:'Your pitch', example:'“I want a Gandalf who seems delighted by hobbits.”'},
]

export default function CastingEntry({publicMode}:{publicMode:boolean}) {
  const [screen,setScreen] = useState<Screen>('starting')
  const [hideSplash,setHideSplash] = useState(false)
  const [lesson,setLesson] = useState(0)
  const [mode,setMode] = useState<Room>('library')
  const [data,setData] = useState<Catalogue|null>(null)
  const [error,setError] = useState('')
  const [attempt,setAttempt] = useState(0)
  const lessonTitle = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let skip = false
    let room:Room = 'library'
    try {
      skip = localStorage.getItem(hideSplashKey)==='yes'
      if (skip && localStorage.getItem(lastRoomKey)==='guided') room='guided'
    } catch {}
    setHideSplash(skip)
    if (params.get('cast') || params.get('title')) {
      setScreen('room')
    } else if (skip && params.get('landing')!=='1') {
      setMode(room)
      setScreen('room')
    } else {
      setScreen('welcome')
    }
  },[])

  useEffect(() => {
    if (screen==='tutorial') lessonTitle.current?.focus({preventScroll:true})
    if (screen!=='room' || data) return
    const controller = new AbortController()
    fetch('/api/preview/catalogue',{signal:controller.signal}).then(async res => {
      if (!res.ok) throw new Error()
      const catalogue:Catalogue = await res.json()
      if (!catalogue.challenges?.length || !catalogue.actors?.length) throw new Error()
      if (!controller.signal.aborted) setData(catalogue)
    }).catch(()=>{if(!controller.signal.aborted)setError('The casting room could not load. Please try again.')})
    return () => controller.abort()
  },[screen,data,attempt])

  function rememberRoom(room:Room) {
    setMode(room)
    try { localStorage.setItem(lastRoomKey,room) } catch {}
  }

  function enter(room:Room) {
    rememberRoom(room)
    setError('')
    setScreen('room')
    window.scrollTo(0,0)
  }

  function howTo() {
    if (location.search) history.replaceState(null,'',location.pathname)
    setLesson(0)
    setScreen('tutorial')
    window.scrollTo(0,0)
  }

  function selectPath(path:'new'|'expert') {
    try {
      if (hideSplash) localStorage.setItem(hideSplashKey,'yes')
      else localStorage.removeItem(hideSplashKey)
    } catch {}
    if (path==='new') {
      rememberRoom('library')
      howTo()
    } else {
      enter('library')
    }
  }

  if (screen==='starting') return <div className="splash-boot" aria-label="Opening WilderLeague" aria-busy="true"/>
  if (screen==='welcome') return <main className="wl-splash" aria-labelledby="splash-title">
    <div className="splash-content">
      <h1 id="splash-title" aria-label="WilderLeague"><span>Wilder</span><span>League</span></h1>
      <div className="splash-choices">
        <button className="splash-new" onClick={()=>selectPath('new')}>New here<small>Take the quick tutorial</small></button>
        <button className="splash-expert" onClick={()=>selectPath('expert')}>Expert Caster<small>Go straight to casting</small></button>
      </div>
      <label className="splash-preference"><input type="checkbox" checked={hideSplash} onChange={e=>setHideSplash(e.target.checked)}/>Don’t show this to me again</label>
    </div>
  </main>

  if (screen==='room' && data) return <TesterApp data={data} publicMode={publicMode} initialMode={mode} onTutorial={howTo} onRoomChange={rememberRoom}/>
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
    </section>:<section className="quick-lesson" aria-live="polite"><h1>The casting room</h1><p>{error||'Opening the actor and title catalogues…'}</p>
      {error&&<button className="primary" onClick={()=>{setError('');setAttempt(n=>n+1)}}>Try again</button>} <button className="plain" onClick={()=>setScreen('welcome')}>Back to welcome</button>
    </section>}</main>
  </div>
}
