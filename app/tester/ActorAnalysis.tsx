'use client'
import {AI_NAME} from '../../lib/big-pudding'
import {useLayoutEffect,useRef} from 'react'
import type {TesterActor} from '../../lib/tester/model'
import type {ActorAnalysis} from '../../lib/tester/actor-analysis'
import ActorPortrait from './ActorPortrait'
import {useCastingResource} from './useCastingResource'

const sections = [
  ['signature_quality','Signature quality'],['best_cast_as','Best cast as'],
  ['strengths','Strengths'],['weaknesses','Limitations'],
  ['archetype','Archetype'],['career_stage','Career stage'],
] as const

function readAnalysis(body:unknown) {
  if (!body || typeof body!=='object' || !('analysis' in body)) throw new Error()
  return body as {analysis:ActorAnalysis|null}
}

export default function ActorAnalysisDialog({actor,onDismiss}:{actor:TesterActor;onDismiss:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const tmdb = /^tmdb:([1-9]\d*)$/.exec(actor.id)?.[1]
  const {value,failed,retry} = useCastingResource('/api/preview/actor-analysis/'+tmdb,!!tmdb,readAnalysis)
  const analysis = value?.analysis
  useLayoutEffect(()=>{
    const element = dialog.current!
    element.showModal()
    return ()=>element.close()
  },[])
  return <dialog ref={dialog} className="actor-analysis" aria-modal="true" aria-labelledby="analysis-name"
    onCancel={event=>{event.preventDefault();onDismiss()}} onClick={event=>{if(event.target===event.currentTarget) onDismiss()}}>
    <div className="analysis-sheet">
      <div className="analysis-intro">
        <ActorPortrait name={actor.name} src={actor.image} className="analysis-photo" eager/>
        <div><p>Actor analysis</p><h2 id="analysis-name">{actor.name}</h2>
          <small>{[actor.birthYear && 'Born '+actor.birthYear,actor.nationality].filter(Boolean).join(' · ')}</small></div>
        <button autoFocus type="button" aria-label="Close actor analysis" onClick={onDismiss}>×</button>
      </div>
      <div className="analysis-body">
        {analysis ? <>
          <h3>From {AI_NAME}’s archive</h3>
          <small className="analysis-source">Casting notes originally credited to Marlowe</small>
          {analysis.casting_profile && <p className="assessment">{analysis.casting_profile}</p>}
          <dl>{sections.map(([key,label])=>analysis[key] && <div key={key}><dt>{label}</dt><dd>{analysis[key]}</dd></div>)}</dl>
        </> : failed ? <p role="status">The casting notes couldn’t load. <button type="button" onClick={retry}>Try again</button></p> :
          <p role="status">{value || !tmdb?'No archived casting assessment for this actor yet.':'Loading the casting notes…'}</p>}
        {actor.knownFor && <div className="analysis-credits"><h3>Known for</h3><p>{actor.knownFor.split(';').map(s=>s.trim()).filter(Boolean).join(' · ')}</p></div>}
      </div>
    </div>
  </dialog>
}
