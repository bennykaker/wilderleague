'use client'
import {useState} from 'react'

const features = [
  {id:'lorre-gladiator', title:'Gladiator', rule:'The Chuck Lorre ensemble', poster:'ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg'},
  {id:'sorkin-pulp-fiction', title:'Pulp Fiction', rule:'The Aaron Sorkin ensemble', poster:'vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg'},
  {id:'snl-fellowship', title:'The Fellowship of the Ring', rule:'Saturday Night Live cast members', poster:'6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg'},
]

function Poster({feature}:{feature:typeof features[number]}) {
  const [failed,setFailed]=useState(false)
  return <>
    <div className="challenge-art">
      {failed?<span>{feature.title}</span>:<img alt="" src={'https://image.tmdb.org/t/p/w342/'+feature.poster} width={342} height={513} onError={()=>setFailed(true)}/>}
    </div>
    <div className="challenge-caption"><strong>{feature.title}</strong><span>{feature.rule}</span></div>
  </>
}

export default function ChallengePosters({onCast,available}:{onCast?:(id:string)=>void;available?:string[]}) {
  const titles=available?features.filter(f=>available.includes(f.id)):features
  return <div className="challenge-posters">{titles.map(f=>onCast
    ? <button type="button" className="classic-poster" key={f.id} onClick={()=>onCast(f.id)}><Poster feature={f}/></button>
    : <div className="classic-poster" key={f.id}><Poster feature={f}/></div>)}</div>
}
