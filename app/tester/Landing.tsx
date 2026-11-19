'use client'
import {useState} from 'react'
import type {TesterActor} from '../../lib/tester/model'

const castingIdeas=[
 {name:'Allison Janney',role:'President Bartlet',show:'The West Wing',reason:'She’s done the briefing room. Give her the Oval Office.'},
 {name:'Jane Wickline',role:'Ron Swanson',show:'Parks and Recreation',reason:'Same deadpan refusal to participate. Much less moustache.'},
 {name:'Andrew Scott',role:'Don Draper',show:'British Mad Men',reason:'He could make you believe the pitch, then let you see what it costs him.'},
 {name:'Rosamund Pike',role:'Betty Draper',show:'British Mad Men',reason:'Perfect manners, with something much sharper underneath.'},
 {name:'Hugh Grant',role:'Roger Sterling',show:'British Mad Men',reason:'A man who can turn being absolutely no help into a charm offensive.'},
]
function CastingIdea({idea,actor}:{idea:typeof castingIdeas[number];actor?:TesterActor}){
 const [failed,setFailed]=useState(false)
 return <figure className="landing-idea">
  <div className="landing-idea-photo">{actor?.image&&!failed?<img src={actor.image} alt={idea.name} width={300} height={240} onError={()=>setFailed(true)}/>:<span>{idea.name}</span>}</div>
  <figcaption><p className="landing-idea-show">{idea.show}</p><h2>{idea.name}</h2><p className="landing-idea-role">as {idea.role}</p><p className="landing-idea-reason">{idea.reason}</p></figcaption>
 </figure>
}
export default function Landing({actors,onStart}:{actors:TesterActor[];onStart:()=>void}){
 return <div className="landing">
  <section className="landing-hero" aria-labelledby="landing-title">
   <div className="landing-copy">
    <p className="eyebrow">A GAME FOR PEOPLE WHO HAVE CASTING OPINIONS</p>
    <h1 id="landing-title">Same characters. Your cast.</h1>
    <p className="landing-lede">Who would you put in a reboot of your favourite show?</p>
    <p>Pick actors working today, make your case, and see who agrees. Play a challenge or put faces to the characters in a book. Every role is open to any gender.</p>
    <button className="primary landing-cta" onClick={onStart}>Try a three-role challenge <span aria-hidden="true">↗</span></button>
    <p className="landing-note">Start with Breaking Bad. No account needed.</p>
   </div>
  </section>
  <section className="landing-ideas" aria-labelledby="casting-ideas-title">
   <div className="landing-ideas-heading"><h2 id="casting-ideas-title">A few casting arguments to get us started.</h2><p>Including three for a British Mad Men.</p></div>
   <div className="landing-idea-grid">{castingIdeas.map(idea=><CastingIdea key={idea.name} idea={idea} actor={actors.find(a=>a.name===idea.name)}/>)}</div>
   <p className="landing-ideas-note">Fan casting ideas. None of these productions are announced.</p>
  </section>
  <section className="landing-how" aria-label="How it works">
   <div><span>01</span><h2>Pick your actors.</h2><p>Choose who plays each role. Go obvious, unexpected, or somewhere in between.</p></div>
   <div><span>02</span><h2>Make your case.</h2><p>Tell us what you see in the cast. A sentence is enough. You can skip this, too.</p></div>
   <div><span>03</span><h2>See who agrees.</h2><p>Share your cast. Vote for the best choices and the ones that deserve a “hear me out.”</p></div>
  </section>
  <section className="landing-next" aria-labelledby="landing-next-title">
   <div className="landing-section-head"><p className="eyebrow">START SMALL. THEN KEEP CASTING.</p><h2 id="landing-next-title">Three challenges to get you going.</h2><p>Each one gives you a little more room to play.</p></div>
   <div className="landing-challenge-grid">
    <article><span className="landing-number">01 / THREE ROLES</span><h3>Breaking Bad.<br/>The SNL cast.</h3><p>Walter, Jesse and Skyler, played by living Saturday Night Live cast members. That’s your first challenge.</p><span className="landing-card-end">Start here <span aria-hidden="true">↗</span></span></article>
    <article><span className="landing-number">02 / THE MAIN CAST</span><h3>A new<br/>West Wing.</h3><p>Recast the season-four regulars for a reboot made today. This time, describe the kind of actor you want to find.</p><span className="landing-card-end">Next up</span></article>
    <article><span className="landing-number">03 / ACROSS THE POND</span><h3>Mad Men.<br/>British edition.</h3><p>Build a British cast for the first season. The whole ensemble has to work together.</p><span className="landing-card-end">Then try this</span></article>
   </div>
  </section>
  <section className="landing-after"><div><p className="eyebrow">AFTER THAT, IT’S UP TO YOU</p><h2>Twelve challenges.<br/>Or something of your own.</h2><p>Pick a show, film or book from the library, or add your own title and characters. Save your cast, share an image, or take it to your own AI for a second opinion.</p></div><div className="landing-after-action"><button className="primary landing-cta" onClick={onStart}>Start with three roles <span aria-hidden="true">→</span></button><p className="landing-note">Make an account when you want to save or vote.</p></div></section>
 </div>
}
