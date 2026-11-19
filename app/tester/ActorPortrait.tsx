'use client'
import Image, {type StaticImageData} from 'next/image'
import {useState} from 'react'
import downey from './portraits/robert-downey-jr.webp'
import sandler from './portraits/adam-sandler.webp'
import murphy from './portraits/eddie-murphy.webp'
import cranston from './portraits/bryan-cranston.webp'
import paul from './portraits/aaron-paul.webp'
import gunn from './portraits/anna-gunn.webp'

export const featuredActors = ['Robert Downey Jr.', 'Adam Sandler', 'Eddie Murphy']
const portraits:Record<string,StaticImageData|string> = {
  'Robert Downey Jr.':downey, 'Adam Sandler':sandler, 'Eddie Murphy':murphy,
  'Bryan Cranston':cranston, 'Aaron Paul':paul, 'Anna Gunn':gunn,
}
export function hasBundledPortrait(name:string) {
  return Object.hasOwn(portraits,name)
}

type PortraitProps = {name:string; src?:string; className?:string; compact?:boolean; eager?:boolean}

export default function ActorPortrait({name,src='',className='',compact=false,eager=false}:PortraitProps) {
  const [failed,setFailed] = useState<string[]>([])
  const bundled = hasBundledPortrait(name) ? portraits[name] : undefined
  const local = typeof bundled==='string' ? bundled : bundled?.src
  const remote = src.replace(/^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:w\d+|original)\//,compact?'$1w185/':'$1w342/')
  const preferLocal = compact || featuredActors.includes(name)
  const options = [
    preferLocal && local ? {url:local,optimize:false} : null,
    /^https:\/\/image\.tmdb\.org\/t\/p\//.test(remote) ? {url:remote,optimize:true} : null,
    remote ? {url:remote,optimize:false} : null,
    !preferLocal && local ? {url:local,optimize:false} : null,
  ]
  const source = options.find(s=>s && !failed.includes(String(s.optimize)+s.url))
  const label = name ? name+' headshot' : 'No original performer listed'
  if (!source) return <span className={className+' photo-unavailable'} role="img" aria-label={name?'Photo unavailable for '+name:label}>
    {name.split(/\s+/).filter(Boolean).map(part=>part[0]).slice(0,2).join('')||'—'}
  </span>
  const props = {className,alt:label,width:compact?52:185,height:compact?66:248,
    loading:eager?'eager' as const:'lazy' as const,
    onError:()=>setFailed(previous=>[...previous,String(source.optimize)+source.url])}
  return source.optimize ? <Image {...props} src={source.url} sizes={compact?'52px':'(max-width: 760px) 45vw, 240px'}/> :
    <img {...props} src={source.url} referrerPolicy="no-referrer"/>
}
