'use client'
import {useCallback, useEffect, useState} from 'react'
import type {Catalogue} from '../../lib/tester/model'
import {JOURNEY_KEY} from '../../lib/tester/journey'
import TesterApp from './TesterApp'
import './tester.css'
import './bookshelf.css'

type Room = 'library'|'guided'
const preference = 'wilderleague:opening-v1'
const lessons = [
  {title:'Pick a story.', text:'Choose a film, a show, a book, or an entire universe. Try Middle-earth if one book feels too small.', label:'Title', example:'The Fellowship of the Ring'},
  {title:'Put a face to the name.', text:'Choose a character and search for the actor you see in the role. Pick a living actor of any gender. Each actor gets one part.', label:'Role', example:'Gandalf'},
  {title:'Make your case.', text:'Add a line about your choices. Sign in to save a private cast or share a link. A book or universe cast can start with a single role.', label:'Your pitch', example:'“I want a Gandalf who seems delighted by hobbits.”'},
]

export default function CastingEntry({publicMode}:{publicMode:boolean}) {
  const [screen,setScreen] = useState<'welcome'|'tutorial'|'room'>('welcome')
  const [lesson,setLesson] = useState(0)
  const [mode,setMode] = useState<Room>('library')
  const [data,setData] = useState<Catalogue|null>(null)
  const [error,setError] = useState('')
  const [attempt,setAttempt] = useState(0)
  const enter = useCallback((room:Room) => {
    try { localStorage.setItem(preference,room) } catch {}
    setMode(room); setError(''); setScreen('room')
    window.scrollTo(0,0)
  },[])
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('cast') || params.get('title')) { enter('library'); return }
    if (params.get('landing')==='1') return
    try {
      const choice = localStorage.getItem(preference)
      if (choice==='library' || choice==='guided') enter(choice)
      else {
        const old = JSON.parse(localStorage.getItem(JOURNEY_KEY)||'null')
        if (old?.stage>0 || old?.results?.length) enter(old.stage===3?'library':'guided')
      }
    } catch {}
  },[enter])
  useEffect(() => {
    if (screen!=='room' || data) return
    const controller = new AbortController()
    fetch('/api/preview/catalogue',{signal:controller.signal}).then(async res => {
      if (!res.ok) throw new Error()
      const catalogue:Catalogue = await res.json()
      if (!catalogue.challenges?.length || !catalogue.actors?.length) throw new Error()
      setData(catalogue)
    }).catch(()=>{if(!controller.signal.aborted)setError('The casting room could not load. Please try again.')})
    return () => controller.abort()
  },[screen,data,attempt])
  function howTo() { if(location.search)history.replaceState(null,'',location.pathname);setLesson(0); setScreen('tutorial'); window.scrollTo(0,0) }
  if (screen==='room' && data) return <TesterApp data={data} publicMode={publicMode} initialMode={mode} onTutorial={howTo} onRoomChange={room=>{setMode(room);try{localStorage.setItem(preference,room)}catch{}}}/>
  return <div className="tester book-entry"><header><button className="brand plain" onClick={()=>setScreen('welcome')}>WilderLeague</button>{screen==='tutorial'&&<button className="plain" onClick={()=>enter('library')}>Skip tutorial</button>}</header>
    <main>{screen==='welcome' ? <section className="welcome-spread">
      <div className="welcome-copy"><h1>New here?<br/><em>Or do you know it all?</em></h1>
        <p>Who would you cast in your favourite book, film or show?</p>
        <div className="entry-actions"><button className="primary" onClick={howTo}>New here <small>Take the quick tutorial</small></button><button onClick={()=>enter('library')}>I know it all <small>Open the casting room</small></button></div>
      </div>
      <div className="audition-sheet" aria-label="Sample casting sheet"><div className="sheet-heading">WilderLeague <span>Casting sheet</span></div><p className="sheet-story">Guards! Guards!</p><p className="sheet-author">Terry Pratchett · Discworld</p><div className="sheet-rule"/>{['Sam Vimes','Lady Sybil Ramkin','Carrot Ironfoundersson'].map(name=><div className="sheet-line" key={name}><strong>{name}</strong><i>Open role</i></div>)}</div>
    </section> : screen==='tutorial' ? <section className="quick-lesson" aria-labelledby="lesson-heading">
      <div className="lesson-progress" aria-label={`Tutorial step ${lesson+1} of 3`}>{lessons.map((step,i)=><span key={step.title} className={i<=lesson?'done':''}/>)}</div>
      <p className="lesson-count">Quick tutorial · {lesson+1} of {lessons.length}</p><div aria-live="polite"><h1 id="lesson-heading">{lessons[lesson].title}</h1><p>{lessons[lesson].text}</p><div className="example-choice"><small>{lessons[lesson].label}</small><strong>{lessons[lesson].example}</strong></div></div>
      <div className="actions"><button onClick={()=>lesson?setLesson(lesson-1):setScreen('welcome')}>Back</button>{lesson<2?<button className="primary" onClick={()=>setLesson(lesson+1)}>Next</button>:<><button className="primary" onClick={()=>enter('library')}>Start casting</button><button onClick={()=>enter('guided')}>Try a guided challenge</button></>}</div>
    </section> : <section className="quick-lesson" aria-live="polite"><h1>The casting room</h1><p>{error||'Opening the actor and title catalogues…'}</p>{error&&<button className="primary" onClick={()=>{setError('');setAttempt(n=>n+1)}}>Try again</button>} <button className="plain" onClick={()=>setScreen('welcome')}>Back to welcome</button></section>}</main>
  </div>
}
