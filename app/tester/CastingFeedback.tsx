'use client'
import {useEffect,useState} from 'react'
import type {Feedback} from '../../lib/tester/feedback'
type State={status:string;feedback?:Feedback;createdAt?:string}
export default function CastingFeedback({payload}:{payload:object}){
 const [state,setState]=useState<State>({status:'loading'}),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const body=JSON.stringify(payload)
 useEffect(()=>{let active=true;let timer:ReturnType<typeof setTimeout>;const controller=new AbortController()
 async function load(){try{const r=await fetch('/api/preview/feedback-status',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal});const d=await r.json();if(!r.ok)throw new Error(d.error);if(active){setState(d);if(d.status==='pending'&&Date.now()-Date.parse(d.createdAt)<90000)timer=setTimeout(load,3000)}}catch(e){if(active){setError((e as Error).message);setState({status:'unavailable'})}}}
 void load();return()=>{active=false;clearTimeout(timer);controller.abort()}
 },[body,busy])
 async function request(){setBusy(true);setError('');try{const r=await fetch('/api/preview/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body});const d=await r.json();if(!r.ok)throw new Error(d.error);setState(d)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const f=state.feedback,stale=state.status==='pending'&&Date.now()-Date.parse(state.createdAt||'')>90000
 return <section className="casting-feedback" aria-labelledby="feedback-heading"><h2 id="feedback-heading">Another take on your cast</h2><p>Optional feedback from Claude Sonnet. Creative suggestions, not a score. It can get facts wrong.</p><p className="muted">This never affects leaderboard votes or sample scores. Your cast and rationale are sent to Anthropic only when you request feedback. The review is saved for this cast; reopening the same cast and rationale reuses it. Changed choices or rationale need a new review.</p>
 {error&&<p role="alert">{error}</p>}
 {state.status==='loading'&&<p role="status">Checking for saved feedback…</p>}
 {state.status==='none'&&<button disabled={busy} onClick={request}>{busy?'Getting feedback…':'Ask Sonnet for feedback'}</button>}
 {(busy||state.status==='pending')&&<p role="status">{stale?'This request may have been interrupted. It will not be sent again automatically, to avoid another charge.':'Getting your feedback. You can leave this page; the saved result will be here when you return.'}</p>}
 {state.status==='failed'&&<p role="status">The review could not be completed. We won’t automatically send this cast again, because the first attempt may have incurred a charge.</p>}
 {state.status==='ready'&&f&&<div><p className="muted">Saved Sonnet feedback{state.createdAt?' · '+new Date(state.createdAt).toLocaleDateString():''}</p><p>{f.review}</p><h3>A promising choice</h3><p><strong>{f.promising_choice.actor} as {f.promising_choice.role}</strong><br/>{f.promising_choice.reason}</p><h3>A question to explore</h3><p><strong>{f.question_to_explore.actor} as {f.question_to_explore.role}</strong><br/>{f.question_to_explore.reason}</p><p className="muted">{f.evidence_limits}</p></div>}
 </section>
}
