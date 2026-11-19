'use client'
import {useState} from 'react'
import type {Challenge} from '../../lib/tester/model'

export default function RosterContribution({challenge,roleName}:{challenge:Challenge;roleName:string}) {
 const [kind,setKind] = useState<''|'art'|'add'|'remove'|'correct'>('')
 const [name,setName] = useState(roleName)
 const [state,setState] = useState<'idle'|'sending'|'done'>('idle')
 const [error,setError] = useState('')
 async function submit(e:React.FormEvent<HTMLFormElement>) {
   e.preventDefault()
   if(state==='sending')return
   const form=new FormData(e.currentTarget)
   form.set('kind',kind);form.set('slug',challenge.id.slice(5))
   setState('sending');setError('')
   try {
     const res=await fetch('/api/preview/contributions',{method:'POST',body:form})
     if (!res.ok) {const message=await res.json().catch(()=>({}));throw new Error(message.error||'Could not send your submission. Please try again.')}
     setState('done')
   } catch(err) {setError((err as Error).message);setState('idle')}
 }
 return <details className="roster-contribution" onToggle={e=>{if(e.currentTarget.open&&!kind)setName(roleName)}}>
   <summary>Send fan art or suggest a roster change</summary>
   {state==='done'?<div role="status"><p>Thank you. Your submission is in the review queue for {challenge.title}.</p><button onClick={()=>{setState('idle');setKind('')}}>Send another</button></div>:<form onSubmit={submit}>
     <label>What would you like to send?<select value={kind} disabled={state==='sending'} onChange={e=>{const value=e.target.value as typeof kind;setKind(value);setName(value==='add'?'':roleName);setError('')}} required><option value="">Choose a contribution</option><option value="art">Original fan art</option><option value="add">Add a missing character</option><option value="remove">Remove a minor or unrelated character</option><option value="correct">Correct a character’s name or details</option></select></label>
     {kind&&<fieldset disabled={state==='sending'}><legend>{challenge.title}</legend>
       <label>Character{kind==='add'||kind==='art'?<input name="character" value={name} onChange={e=>setName(e.target.value)} required maxLength={120}/>:<select name="character" value={name} onChange={e=>setName(e.target.value)} required>{challenge.roles.map(r=><option key={r.id}>{r.name}</option>)}</select>}</label>
       {kind==='art'?<><label>Artwork · PNG, JPEG or WebP, up to 4 MB<input type="file" name="file" accept="image/png,image/jpeg,image/webp" required/></label><label>Artist credit<input name="credit" required maxLength={100}/></label><label>Contact email<input name="email" type="email" required maxLength={254}/></label><label className="agreement"><input type="checkbox" required name="consent" value="yes"/> This is my artwork. WilderLeague may display it with my credit.</label></>:null}
       <label>{kind==='art'?'Artist’s note (optional)':'What should we change, and why?'}<textarea name="message" required={kind!=='art'} maxLength={2000}/></label>
       {error&&<p role="alert">{error}</p>}<button className="primary">{state==='sending'?'Sending…':'Send for review'}</button>
     </fieldset>}
   </form>}
 </details>
}
