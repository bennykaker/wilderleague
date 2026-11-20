'use client'
import Image, {type StaticImageData} from 'next/image'
import {useState} from 'react'
import photoFiles from '@/data/actor-portraits/files.json'
import originalPhotos from '../../data/actor-portraits/originals.json'
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

const cataloguePhotos:Record<string,string> = photoFiles
const originalSources:Record<string,string> = originalPhotos
const tmdbSize = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\//

type PortraitProps = {name:string; src?:string; className?:string; compact?:boolean; eager?:boolean; draggable?:boolean}

export default function ActorPortrait({name,src='',className='',compact=false,eager=false,draggable}:PortraitProps) {
  const [failed,setFailed] = useState<string[]>([])
  const bundled = hasBundledPortrait(name) ? portraits[name] : undefined
  const local = typeof bundled==='string' ? bundled : bundled?.src
  const original = src || (Object.hasOwn(originalSources,name) ? originalSources[name] : '')
  const photoKey = original.replace(tmdbSize,'')
  const cataloguePhoto = Object.hasOwn(cataloguePhotos,photoKey) ? cataloguePhotos[photoKey] : undefined
  const remote = original.replace(tmdbSize,compact?'https://image.tmdb.org/t/p/w185/':'https://image.tmdb.org/t/p/w342/')
  const options = [
    cataloguePhoto ? {url:cataloguePhoto,optimize:false} : null,
    local ? {url:local,optimize:false} : null,
    tmdbSize.test(remote) ? {url:remote,optimize:true} : null,
    remote ? {url:remote,optimize:false} : null,
  ]
  const failureKey=(option:{url:string;optimize:boolean})=>
    option.url===cataloguePhoto?'catalogue:'+photoKey:option.url===local?'bundled:'+name:String(option.optimize)+option.url
  const source = options.find(s=>s && !failed.includes(failureKey(s)))
  const label = name ? name+' headshot' : 'No original performer listed'
  if (!source) return <span className={className+' photo-unavailable'} role="img" aria-label={name?'Photo unavailable for '+name:label}>
    {name.split(/\s+/).filter(Boolean).map(part=>part[0]).slice(0,2).join('')||'—'}
  </span>
  const props = {className,draggable,alt:label,width:compact?52:185,height:compact?66:248,
    loading:eager || source.url.startsWith('data:')?'eager' as const:'lazy' as const,
    onError:()=>setFailed(previous=>[...previous,failureKey(source)])}
  return source.optimize ? <Image {...props} src={source.url} sizes={compact?'52px':'(max-width: 760px) 45vw, 240px'}/> :
    <img {...props} src={source.url} referrerPolicy="no-referrer"/>
}
