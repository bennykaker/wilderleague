'use client'
import {useState} from 'react'
import ActorPortrait from './ActorPortrait'
import {lorreMadMen} from '../../lib/tester/challenges'

type Pick = {actor:string; role:string; photo:string; credit?:string}
type Example = {
  id:string
  label:string
  title:React.ReactNode
  pitch:string
  slug:string
  action:string
  picks:Pick[]
}

const examples:Example[] = [
  {
    id:'cheers', label:'Cheers', title:<>The <em>Cheers</em> reboot</>,
    pitch:'Sam thinks he can charm his way out of reading Diane’s favourite novel. Carla has already read it and is saving the ending for the worst possible moment.',
    slug:'cheers', action:'Recast Cheers',
    picks:[
      {actor:'Jake Johnson', role:'Sam Malone', photo:'3UNfW2qZgRkW81neNVfQvaRC92K'},
      {actor:'Jodie Comer', role:'Diane Chambers', photo:'ye7rdpq4KY7c0OqfRqeWMUZaneb'},
      {actor:'Natasha Lyonne', role:'Carla Tortelli', photo:'2QJoTBEIeYyjGSDot9qxv2ayPH3'},
      {actor:'David Harbour', role:'Norm Peterson', photo:'qMFtMWlYVtFVyBoBhX5IoA5sN5a'},
      {actor:'Richard Kind', role:'Cliff Clavin', photo:'yWmuVQeQUzb5OSMVDoWkR0IylCK'},
      {actor:'Stephen Root', role:'Coach Ernie Pantusso', photo:'2Zwi6AydqQQ9InVdhjYcfJXNzkp'},
    ],
  },
  {
    id:'acotar', label:'Romantasy', title:<em>A Court of Thorns and Roses</em>,
    pitch:'Give Theo James the Spring Court. Dev Patel can make Rhysand’s offer sound like a favour right up until Feyre hears the price.',
    slug:'book-sarah-j-maas-a-court-of-thorns-and-roses', action:'Cast this book',
    picks:[
      {actor:'Margaret Qualley', role:'Feyre Archeron', photo:'jStNyMj3acpLuH48awLVLqqlyaV'},
      {actor:'Theo James', role:'Tamlin', photo:'lSC4cMhcQeCjPFkK6qCjSGDSeR3'},
      {actor:'Dev Patel', role:'Rhysand', photo:'1g07SUVwZHvKgM1Z7H4RYIEOXcm'},
      {actor:'Domhnall Gleeson', role:'Lucien Vanserra', photo:'qSSHBmfD4keoBfkaBBLoOfkpkjU'},
      {actor:'Eva Green', role:'Amarantha', photo:'8MqXy7Jd6HsRSBFK05J0KrR2x5Z'},
    ],
  },
  {
    id:'mad-men', label:'Mad Men', title:<><em>Mad Men</em> with Chuck Lorre actors</>,
    pitch:'Only actors from Chuck Lorre shows. Ashton Kutcher pitches the ad. Melanie Lynskey quietly fixes it. Allison Janney takes the client to lunch and comes back with a boat.',
    slug:lorreMadMen.id, action:'Try the Chuck Lorre challenge',
    picks:[
      {actor:'Ashton Kutcher', role:'Don Draper', photo:'qJlM29jTncF9GpmE0PPVwbp5iPB', credit:'Walden Schmidt · Two and a Half Men'},
      {actor:'Melanie Lynskey', role:'Peggy Olson', photo:'kzrWI1sTgnA0H7TCIKzDOUtOW4n', credit:'Rose · Two and a Half Men'},
      {actor:'Allison Janney', role:'Roger Sterling', photo:'hpBKWV1jjoXQbr1s0iUZTSvw582', credit:'Bonnie Plunkett · Mom'},
      {actor:'Jaime Pressly', role:'Joan Holloway', photo:'cPS3VVmV0syoWn14W3AY7ALgtFV', credit:'Jill Kendall · Mom'},
      {actor:'Simon Helberg', role:'Pete Campbell', photo:'zGrQSfQEw0vO6otWdSXiBHfwv7S', credit:'Howard Wolowitz · The Big Bang Theory'},
      {actor:'Kaley Cuoco', role:'Betty Draper', photo:'c01Ma8Jrr2OJ6uoikPwDK34Y8eK', credit:'Penny · The Big Bang Theory'},
    ],
  },
]

function CastLineup({picks}:{picks:Pick[]}) {
  return <ul className="example-lineup">
    {picks.map(pick=><li key={pick.role}>
      <ActorPortrait name={pick.actor} src={'/actor-portraits/'+pick.photo+'.webp'} className="example-photo"/>
      <div><strong>{pick.actor}</strong><span>as {pick.role}</span>{pick.credit && <small>{pick.credit}</small>}</div>
    </li>)}
  </ul>
}

export default function ExampleCasts({openTitle}:{openTitle:(slug:string)=>void}) {
  const [example,setExample]=useState(examples[0])
  return <section id="example-casts" className="example-casts" aria-labelledby="example-casts-heading">
    <h2 id="example-casts-heading">Recasts We Did</h2>
    <div className="example-selector" role="group" aria-label="Choose an example cast">
      {examples.map(item=><button key={item.id} type="button" aria-pressed={item.id===example.id}
        aria-controls="example-cast-sheet" onClick={()=>setExample(item)}>{item.label}</button>)}
    </div>
    <article key={example.id} id="example-cast-sheet" className={'example-sheet sheet-'+example.id}>
      <h3>{example.title}</h3>
      <CastLineup picks={example.picks.slice(0,3)}/>
      <p className="example-pitch">{example.pitch}</p>
      <details className="example-remaining">
        <summary><span className="more-picks">See all {example.picks.length} roles</span><span className="fewer-picks">Show the first three</span></summary>
        <CastLineup picks={example.picks.slice(3)}/>
      </details>
      <button className="example-play" type="button" onClick={()=>openTitle(example.slug)}>{example.action}</button>
    </article>
  </section>
}
