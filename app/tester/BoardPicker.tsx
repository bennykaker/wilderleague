import {useState} from 'react'
import {pastReboots,tvStunts,weeklyReboot} from '../../lib/tester/board-programme'
import {hasLeaderboard} from '../../lib/tester/leaderboard'
import type {Challenge,LibraryTitle} from '../../lib/tester/model'

type Kind='stunt'|'week'|'book'
const groups:Record<Kind,string>={stunt:'Stunt casting',week:'Weekly reboots',book:'Books'}
export default function BoardPicker({id,select,books,challenges}:{id:string;select:(id:string)=>void;books:LibraryTitle[];challenges:Challenge[]}){
  const kind:Kind=id.startsWith('weekly:')?'week':id.startsWith('free:')?'book':'stunt'
  const week=weeklyReboot(),[query,setQuery]=useState('')
  const lists={
    week:[week,...pastReboots()].map(w=>({id:w.id,label:w.title+' · week of '+w.dates})),
    book:books.map(b=>({id:'free:'+b.slug,label:b.title+(b.author?' — '+b.author:'')})),
    stunt:[...challenges.filter(hasLeaderboard).map(c=>({id:c.id,label:c.title+' · '+c.rule.split('.')[0]})),
      ...tvStunts.map(c=>({id:c.id,label:c.title+' · '+c.brief}))].sort((a,b)=>a.label.localeCompare(b.label)),
  }
  const options=lists[kind],matches=options.filter(o=>o.label.toLowerCase().includes(query.trim().toLowerCase()))
  const current=options.find(o=>o.id===id)
  return <div className="board-picker">
    <p className="board-explainer"><strong>Screen leaderboards are for stunt casting.</strong> Pick a show or film and cast it under a rule, like using only Chuck Lorre actors. Each book has its own board, and one open reboot gets a featured board every week.</p>
    <div className="actions" role="group" aria-label="Leaderboard type">{(Object.keys(groups) as Kind[]).map(k=><button key={k} aria-pressed={kind===k} className={kind===k?'primary':''} onClick={()=>{setQuery('');if(k!==kind&&lists[k][0])select(lists[k][0].id)}}>{groups[k]}</button>)}</div>
    {kind!=='week'&&<label>Find a {kind==='book'?'book':'stunt challenge'}<input type="search" value={query} placeholder={kind==='book'?'Title or author':'Show, film or stunt rule'} onChange={e=>setQuery(e.target.value)}/></label>}
    <label>{groups[kind]} leaderboard<select value={id} onChange={e=>{setQuery('');select(e.target.value)}}>
      {current&&!matches.some(o=>o.id===id)&&<option value={id}>{current.label}</option>}
      {matches.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}
    </select></label>{query&&!matches.length&&<p role="status">No matching boards.</p>}
  </div>
}
