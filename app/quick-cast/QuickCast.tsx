'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { STORAGE_KEY, decodeCast, encodeCast, validPicks, type Actor, type Picks, type QuickData, type SavedCast } from '../../lib/quick-cast/model'
import './quick.css'

type Screen = 'home' | 'game' | 'result' | 'saved'
const preferred = [
  ['Will Ferrell','Jason Sudeikis','Adam Sandler','Bill Hader','Kristen Wiig','Maya Rudolph'],
  ['Andy Samberg','Pete Davidson','Kate McKinnon','Bill Hader','Amy Poehler','Will Ferrell'],
  ['Kristen Wiig','Tina Fey','Maya Rudolph','Amy Poehler','Kate McKinnon','Rachel Dratch'],
]
const briefs = [
  'A chemistry teacher who starts making methamphetamine after a cancer diagnosis.',
  'Walter’s former student and partner. Impulsive, but often more compassionate than Walter.',
  'Walter’s wife. She gradually discovers his criminal life and becomes involved.',
]
const comments: Record<string,string> = {
  'Will Ferrell':'Ferrell could play Walter’s need for respect. A restrained performance would help keep the character threatening.',
  'Jason Sudeikis':'Sudeikis could make Walter seem approachable at first. The challenge would be showing how controlling he becomes.',
  'Adam Sandler':'Sandler could bring out Walter’s anxiety and anger. The early scenes would need enough restraint for the change to register.',
}
const empty = (): Picks => [null,null,null]
export default function QuickCast({data,startInGame=false}:{data:QuickData;startInGame?:boolean}) {
  const [screen,setScreen] = useState<Screen>(startInGame?'game':'home')
  const [picks,setPicks] = useState<Picks>(empty)
  const [active,setActive] = useState(0)
  const [query,setQuery] = useState('')
  const [showAll,setShowAll] = useState(false)
  const [demoId,setDemoId] = useState(data.actors.find(a=>a.name==='Will Ferrell')?.id || data.actors[0].id)
  const [saved,setSaved] = useState<SavedCast[]>([])
  const [shared,setShared] = useState(false)
  const [showComment,setShowComment] = useState(false)
  const [shareUrl,setShareUrl] = useState('')
  const [notice,setNotice] = useState('')
  const [ready,setReady] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const actor = (id:string|null) => data.actors.find(a=>a.id===id)
  const complete = picks.every(id => id !== null)
  const count = picks.filter(Boolean).length

  useEffect(()=>{
    const load = () => {
      let drafts: Picks = empty()
      try {
        const raw = localStorage.getItem(STORAGE_KEY+':draft')
        const parsed: unknown = raw ? JSON.parse(raw) : null
        if(validPicks(parsed,data.actors)) drafts=parsed
        const items: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY+':saved') || '[]')
        if(Array.isArray(items)) setSaved(items.filter((x):x is SavedCast => !!x && typeof x.id==='string' && typeof x.savedAt==='string' && validPicks(x.picks,data.actors,true)).slice(0,50))
      } catch { setNotice('Browser storage is unavailable. You can still cast and copy a share link.') }
      const rawShare = new URLSearchParams(location.search).get('cast')
      if(rawShare!==null){
        const incoming=decodeCast(rawShare,data.actors)
        if(incoming){setPicks(incoming);setShared(true);setScreen('result')}
        else{setPicks(drafts);setScreen('home');setNotice('This cast link is incomplete or contains an actor outside this challenge. You can start a new cast below.')}
      }else{setPicks(drafts);setActive(Math.max(0,drafts.findIndex(p=>!p)))}
      setReady(true)
    }
    load()
  },[data.actors])

  function cleanUrl(){history.replaceState(null,'',location.pathname)}
  function navigate(next:Screen){setScreen(next);setNotice('');setShareUrl('');window.scrollTo(0,0)}
  function storeDraft(next:Picks){setPicks(next);try{localStorage.setItem(STORAGE_KEY+':draft',JSON.stringify(next))}catch{setNotice('This browser could not save your draft. Copy a cast link when you finish.')}}
  function selectRole(index:number){setActive(index);setQuery('');setShowAll(false)}
  function start(fromDemo=false,fresh=false){
    cleanUrl();setShared(false);setShowComment(false)
    const next=fromDemo?[demoId,null,null] as Picks:fresh?empty():picks
    if(fromDemo||fresh)storeDraft(next)
    selectRole(Math.max(0,next.findIndex(p=>!p)));navigate('game')
  }
  function choose(id:string){
    if(picks.some((p,i)=>p===id&&i!==active))return
    const next=[...picks] as Picks;next[active]=id;storeDraft(next);setShowComment(false);setNotice('')
  }
  function nextRole(){if(complete){setShared(false);navigate('result')}else{selectRole(picks.findIndex(p=>!p));heading.current?.focus();window.scrollTo(0,0)}}
  function saveCast(){
    if(!complete)return
    if(saved.some(s=>encodeCast(s.picks)===encodeCast(picks))){setNotice('This cast is already saved on this device.');return}
    if(saved.length>=50){setNotice('This browser has 50 saved casts. Copy a share link to keep this cast separately.');return}
    const item:SavedCast={id:crypto.randomUUID(),picks:[...picks] as Picks,savedAt:new Date().toISOString()}
    const items=[item,...saved].slice(0,50)
    try{localStorage.setItem(STORAGE_KEY+':saved',JSON.stringify(items));setSaved(items);setNotice('Cast saved on this device. Find it under Saved casts.')}catch{setNotice('Your browser could not save this cast. Copy the share link to keep it.')}
  }
  async function share(){
    if(!complete)return
    const url=new URL('/quick-cast',location.origin);url.searchParams.set('cast',encodeCast(picks));setShareUrl(url.href)
    try{await navigator.clipboard.writeText(url.href);setNotice('Cast link copied.')}catch{setNotice('Copy the link shown below.')}
  }
  function showSaved(item:SavedCast){setPicks(item.picks);setShared(false);setShowComment(false);navigate('result')}
  function edit(){cleanUrl();setShared(false);storeDraft(picks);selectRole(0);navigate('game')}
  function portrait(a:Actor|undefined,caption:string,original=false){return <div className={'portrait '+(original?'original':'')}>
    {a?.image?<img src={a.image} alt={a.name}/>:<div className="portrait-placeholder" aria-hidden="true">?</div>}
    <div className="portrait-caption"><small>{caption}</small>{a?.name||'Choose an actor'}</div>
  </div>}
  const demo=actor(demoId)!
  const demoOptions=['Will Ferrell','Jason Sudeikis','Adam Sandler'].map(n=>data.actors.find(a=>a.name===n)).filter((a):a is Actor=>!!a)
  const original:Actor={id:'original',name:data.roles[0].originalActor,image:data.roles[0].originalImage,knownFor:''}
  const sorted=[...data.actors].sort((a,b)=>{
    const rank=(n:string)=>{const i=preferred[active].indexOf(n);return i<0?100:i}
    return rank(a.name)-rank(b.name)
  })
  const matches=sorted.filter(a=>a.name.toLowerCase().includes(query.trim().toLowerCase()))
  const visible=query.trim()||showAll?matches:matches.slice(0,6)
  const note = notice && <p className="error-note" role="status">{notice}</p>

  return <div className="quick-preview">
    <div className="preview-strip">PROJECT PREVIEW <span>Real catalogue · Sample comments · No AI charges</span></div>
    <header><Link href="/" className="brand" onClick={e=>{e.preventDefault();cleanUrl();navigate('home')}} aria-label="WilderLeague home">wilder<span>league</span><i>✳</i></Link>
      <div className="header-right"><Link href="/browse">Browse titles</Link><button className="small outline" onClick={()=>navigate('saved')} disabled={!ready}>Saved casts ({saved.length})</button></div></header>
    <main>
    {screen==='home'&&<>
      {note&&<div style={{maxWidth:1100,margin:'auto',padding:'0 25px'}}>{note}</div>}
      <section className="hero"><div><div className="eyebrow"><span className="dot"/>How WilderLeague works</div><h1>Who would<br/>you <em>cast?</em></h1><p className="intro">Choose different actors for familiar roles. In this challenge, recast {data.title} using Saturday Night Live cast members.</p><button className="primary" onClick={()=>start()} disabled={!ready}>{count?'Continue your cast':'Cast three roles'} <span>→</span></button><p className="micro">Pick Walter, Jesse and Skyler. No account needed.</p></div>
      <div className="demo-panel"><div className="panel-top"><span>Example: Walter White</span><span className="tag">Click to try</span></div><h2>{data.title}.<br/>SNL actors only.</h2><p className="subtitle">{original.name} played Walter White.<br/>Select someone below to replace him.</p><div className="recast">{portrait(original,'The original',true)}<div className="swap">→</div>{portrait(demo,'Your recast')}</div><p className="demo-hint">Choose a replacement:</p><div className="mini-picks">{(demoOptions.length?demoOptions:data.actors.slice(0,3)).map(a=><button key={a.id} className={'mini-pick '+(demoId===a.id?'active':'')} onClick={()=>setDemoId(a.id)} aria-pressed={demoId===a.id}>{a.name}</button>)}</div><div className="sample-quote" aria-live="polite"><small>Marlowe · Sample comment</small>{comments[demo.name]||'This is a sample casting choice. Try it in the three-role challenge.'}</div><button className="primary lime demo-continue" disabled={!ready} onClick={()=>start(true)}>Keep {demo.name} and choose the other roles →</button></div></section>
      <section className="steps" aria-label="How to play">{[['Choose your actors','Select one actor for each role. You can change your choices before sharing.'],['Review your cast','See all three choices together. Read a sample comment from Marlowe, or skip it.'],['Save or share','Save a cast on this device, or copy a link containing all three choices.']].map(([title,text],i)=><div className="step" key={title}><span className="step-number">0{i+1}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>
      <section className="feature-band"><div><div className="eyebrow">Three-role challenge</div><h2>Recast {data.title}</h2><p>Choose from {data.actors.length} actors in the existing SNL challenge pool.</p></div><button className="primary" disabled={!ready} onClick={()=>start()}>Start casting →</button></section>
    </>}
    {screen==='game'&&<section className="game">
      <button className="back" onClick={()=>navigate('home')}>← Home</button><div className="game-heading"><div><div className="challenge-label"><span className="tag light-tag">3 roles</span><span className="eyebrow">SNL alumni only</span></div><h1>Recast {data.title}</h1><p>Choose one SNL actor for each role. Use each actor once.</p></div><span className="progress-count" aria-live="polite">{count} of 3 roles cast</span></div>
      {note}<nav className="role-tabs" aria-label="Choose a role">{data.roles.map((r,i)=><button key={r.name} className={'role-tab '+(active===i?'active':'')} onClick={()=>selectRole(i)} aria-current={active===i?'step':undefined}><span className="role-icon">{actor(picks[i])?.image?<img src={actor(picks[i])!.image} alt=""/>:`0${i+1}`}</span><span><strong>{r.name}</strong><small>{actor(picks[i])?.name||'Choose an actor'}</small></span><span className="check">{picks[i]?'✓':'○'}</span></button>)}</nav>
      <div className="chooser-heading"><div><h2 ref={heading} tabIndex={-1}>Choose {data.roles[active].name}</h2><p>{briefs[active]}</p></div><input className="search" type="search" placeholder="Find an actor…" aria-label="Find an actor" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <div className="pool-tools"><span>{query?`${matches.length} matching actors`:showAll?`${data.actors.length} eligible actors`:'Six choices to start with'}</span>{!query&&<button className="small outline" onClick={()=>setShowAll(!showAll)}>{showAll?'Show fewer':`See all ${data.actors.length} actors`}</button>}</div>
      <div className="actors">{visible.map(a=>{const used=picks.findIndex(id=>id===a.id);const selected=picks[active]===a.id;const disabled=used>=0&&used!==active;return <article className={'actor '+(selected?'selected':'')} key={a.id}><button className="actor-photo" disabled={disabled} onClick={()=>choose(a.id)} aria-label={`Cast ${a.name} as ${data.roles[active].name}`}>{a.image?<img src={a.image} alt={a.name} loading="lazy"/>:<span>{a.name}</span>}</button><div className="actor-body"><h3>{a.name}</h3><button className="cast-button" onClick={()=>choose(a.id)} aria-pressed={selected} disabled={disabled} aria-label={`Choose ${a.name} for ${data.roles[active].name}`}>{selected?'✓ Selected':disabled?`Cast as ${data.roles[used].name.split(' ')[0]}`:`Cast as ${data.roles[active].name.split(' ')[0]} +`}</button></div></article>})}{!visible.length&&<p className="empty">No actors match that name. Clear the search to see the pool.</p>}</div>
      <div className="game-bottom"><p><span className="selected-status">{complete?'Your cast is ready.':`${3-count} ${count===2?'role':'roles'} to go.`}</span>{actor(picks[active])?`${actor(picks[active])!.name} selected.`:'Select an actor to continue.'}</p><button className="primary" disabled={!picks[active]||!ready} onClick={nextRole}>{complete?'See my cast':`Next: ${data.roles[picks.findIndex(p=>!p)].name.split(' ')[0]}`} →</button></div>
    </section>}
    {screen==='result'&&complete&&<section className="results"><button className="back" onClick={edit}>← Change actors</button><div className="eyebrow"><span className="dot"/>{shared?'Shared cast':'3 of 3 roles cast'}</div><h1>{shared?'A Breaking Bad recast':'Your Breaking Bad cast'}</h1><p className="results-intro">Review the choices, change an actor, or copy a link to this cast.</p><div className="cast-poster"><div className="poster-title"><div><h2>{data.title}.</h2><small>{shared?'Shared recast':'Your recast'} · WilderLeague</small></div><span className="tag">SNL alumni only</span></div><div className="final-cast">{data.roles.map((r,i)=><div className="final-person" key={r.name}>{portrait(actor(picks[i]),`as ${r.name}`)}</div>)}</div></div>
      <div className="result-actions"><button className="primary" onClick={share}>Copy cast link ↗</button><button className="secondary" onClick={saveCast}>Save on this device</button><button className="secondary" onClick={edit}>Change my picks</button><button className="secondary" onClick={()=>setShowComment(!showComment)}>{showComment?'Hide sample comment':'Read Marlowe’s comment'}</button>{shared&&<button className="secondary" onClick={()=>start(false,true)}>Make my own cast</button>}</div>{note}
      {showComment&&<section className="verdict"><div className="verdict-head"><div><div className="eyebrow">Marlowe</div><h3>Sample casting comment</h3></div></div><p>{comments[actor(picks[0])!.name]||`${actor(picks[0])!.name} would give Walter a different presence from Bryan Cranston. The performance would need to show his gradual shift from insecurity to control.`}</p><small>This is prewritten demo text, not an AI assessment of your cast.</small></section>}
      <p className="result-note">Saved casts stay in this browser. Share links carry the three actor choices and don’t need an account. Comments are optional; this preview makes no AI calls.</p>
      {shareUrl&&<div className="share-box"><label htmlFor="cast-link">Your cast link</label><input id="cast-link" value={shareUrl} readOnly onFocus={e=>e.currentTarget.select()}/><p>{typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)?'This local preview link works on this computer. An externally hosted preview is needed to send it to friends.':'Anyone with this link can view the cast and make their own.'}</p></div>}
    </section>}
    {screen==='saved'&&<section className="results"><button className="back" onClick={()=>navigate('home')}>← Home</button><h1>Saved casts</h1><p className="results-intro">Saved in this browser on this device. Copy a cast link to keep a separate copy.</p>{!saved.length?<div className="empty"><p>No saved casts yet.</p><button className="primary" onClick={()=>start()}>Cast three roles →</button></div>:<div className="saved-list">{saved.map(item=><article className="saved-row" key={item.id}><h2>{data.title}</h2><p>{item.picks.map(id=>actor(id)?.name).join(' · ')}</p><p>Saved {new Date(item.savedAt).toLocaleDateString()}</p><button className="primary small" onClick={()=>showSaved(item)}>Open cast →</button></article>)}</div>}</section>}
    </main><footer><Link href="/" className="brand">wilder<span>league</span><i>✳</i></Link><p>A film and TV casting game.</p><span>Separate project preview · Live site unchanged</span></footer>
  </div>
}
