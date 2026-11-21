'use client'
import {AI_NAME,ASK_BIG_PUDDING} from '../../lib/big-pudding'
import {useEffect,useRef,useState} from 'react'
import './tutorial.css'

const lessons = [
  {
    clip:'drag', label:'Drag & drop', title:'Give Sam Vimes a new face.',
    text:'Pick a title in the casting room, then select a character. In Guards! Guards!, we’re giving Sam Vimes to Ryan Gosling.',
    tip:'Click and hold the actor’s name or headshot. Drag the card into the outlined role, then release the mouse button.',
    detail:'Using a keyboard? Tab to the actor, press Space to pick up the card, then press Space again to drop it.',
    cues:[[0,'Point to Ryan Gosling’s card.'],[2.1,'Click and hold. Drag the card into the Sam Vimes slot.'],[5.8,'Release the mouse button to cast Gosling as Vimes.']],
  },
  {
    clip:'name', label:'Search by name', title:'Know who you want?',
    text:'Open Search by name and type a first or last name. Watch the actor pool change with each letter.',
    tip:'Try “Gosling.” As soon as Ryan appears, you can drag his card into the role.',
    detail:'If the search box is collapsed, click Role & actor search to open it.',
    cues:[[0,'Choose Search by name.'],[1.65,'Type Gosling. The cards below narrow as you type.'],[4.55,'There’s Ryan. His card is ready to drag.']],
  },
  {
    clip:'ai', label:`Ask ${AI_NAME}`, title:'Have a type in mind?',
    text:'Choose Describe an actor. Try a performance note like “a weary detective with a dry wit,” or a reference like “a Chris Traeger type.”',
    tip:`Click “${ASK_BIG_PUDDING}”. Read the reason on each actor’s card, then drag your favourite into the role.`,
    detail:'Typing alone searches the catalogue. Sign in for a new AI search. Anyone can reuse a saved search. This clip uses a sample answer.',
    cues:[[0,'Switch to Describe an actor.'],[2,'Type “a weary detective with a dry wit.”'],[5.55,`Click “${ASK_BIG_PUDDING}”.`],[7.65,'Read the reasons on the suggested cards. You make the pick.']],
  },
  {
    clip:'share', label:'Save & share', title:'Make the case for your cast.',
    text:'Review your lineup and add a line about what you see in your choices. A book or universe cast is ready to share after one pick.',
    tip:'Sign in and choose Save privately to keep your cast, or Share this cast to get a public link.',
    detail:'Sharing a book cast enters it on that book’s Best Cast and Hear Me Out boards. In a featured challenge, fill every role and choose Submit to leaderboards.',
    cues:[[0,'Review the character and your actor side by side.'],[2.1,'Add a pitch if you like.'],[4.8,'Choose whether to save privately or share your lineup.']],
  },
] as const

type Lesson = typeof lessons[number]
function LessonPlayer({lesson}:{lesson:Lesson}) {
  const video=useRef<HTMLVideoElement>(null)
  const [time,setTime]=useState(0)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{
    const player=video.current
    if (!player) return
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!motion.matches) void player.play().catch(()=>{})
    function updateMotion(){if (motion.matches) player?.pause()}
    motion.addEventListener('change',updateMotion)
    return ()=>motion.removeEventListener('change',updateMotion)
  },[])
  const cue=lesson.cues.filter(([start])=>time>=start).at(-1) ?? lesson.cues[0]
  const base='/tutorial/'+lesson.clip
  const revision=lesson.clip==='drag'?'?v=mouse':lesson.clip==='ai'?'?v=big-pudding':''
  return <figure className="tutorial-player">
    <div className="tutorial-film-title"><span>Guards! Guards!</span><span>Sam Vimes</span></div>
    <video ref={video} controls muted playsInline preload="metadata" poster={base+'.jpg'} src={base+'.mp4'+revision}
      width={768} height={450} aria-label={lesson.label+' screen demonstration'} aria-describedby="tutorial-instructions"
      onError={()=>setFailed(true)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)}>
      <track kind="captions" src={base+'.vtt'+revision} srcLang="en" label="English"/>
    </video>
    <figcaption>
      <span>{failed?'The clip couldn’t load. The steps are written out here.':cue[1]}</span>
      <button type="button" disabled={failed} onClick={()=>{
        if (video.current) {video.current.currentTime=0;setTime(0);void video.current.play().catch(()=>{})}
      }} aria-label="Replay this clip"><span aria-hidden="true">↻</span> Replay</button>
    </figcaption>
  </figure>
}

type TutorialProps = {onExit:()=>void; exitText:string; onWelcome?:()=>void; onGuided?:()=>void}
export default function CastingTutorial({onExit,exitText,onWelcome,onGuided}:TutorialProps){
  const [index,setIndex]=useState(0)
  const lesson=lessons[index]
  const title=useRef<HTMLHeadingElement>(null)
  useEffect(()=>{title.current?.focus({preventScroll:true})},[index])
  return <div className="tester casting-tutorial">
    <header><button className="brand plain" onClick={onWelcome||onExit}>WilderLeague</button>
      <button onClick={onExit}>{onWelcome?'Skip tutorial':exitText}</button></header>
    <main>
      <div className="tutorial-heading"><h1>Casting tutorial</h1></div>
      <nav className="tutorial-chapters" aria-label="Tutorial chapters">{lessons.map((item,i)=>
        <button key={item.clip} type="button" aria-current={i===index?'step':undefined}
          onClick={()=>setIndex(i)}><span aria-hidden="true">{i+1}</span>{item.label}</button>)}</nav>
      <section aria-labelledby="tutorial-title" className="tutorial-chapter">
        <div className="tutorial-intro"><h2 ref={title} id="tutorial-title" tabIndex={-1}>{lesson.title}</h2><p>{lesson.text}</p></div>
        <LessonPlayer key={lesson.clip} lesson={lesson}/>
        <div className="tutorial-notes" id="tutorial-instructions"><p className="tutorial-balloon">{lesson.tip}</p><p>{lesson.detail}</p></div>
      </section>
      <div className="tutorial-nav">
        {index>0?<button onClick={()=>setIndex(index-1)}>← Back</button>:<span/>}
        <div>{index===lessons.length-1&&onGuided&&<button onClick={onGuided}>Try a guided challenge</button>}
          <button className="primary" onClick={()=>index<lessons.length-1?setIndex(index+1):onExit()}>
            {index<lessons.length-1?lessons[index+1].label+' →':exitText+' →'}</button></div>
      </div>
    </main>
  </div>
}
