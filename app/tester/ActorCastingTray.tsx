'use client'
import {useRef,useState,type DragEvent,type KeyboardEvent,type PointerEvent} from 'react'
import type {TesterActor} from '../../lib/tester/model'
import {CastingTip} from './CastingTips'
import ActorPortrait from './ActorPortrait'

const actorDragType='application/x-wilderleague-actor'
type Drag = {actor:TesterActor; method:'native'|'touch'|'keyboard'}
type Point = {x:number; y:number}
type Props = {
  guideStep:'role'|'actor'|'review'
  hasPicks:boolean
  candidates:TesterActor[]
  roleName:string
  pickedActor?:TesterActor
  picks:string[]
  detailFor:(actor:TesterActor)=>string|undefined
  onInspect:(actor:TesterActor)=>void
  onCast:(id:string)=>void
}

export default function ActorCastingTray({guideStep,hasPicks,candidates,roleName,pickedActor,picks,detailFor,onCast,onInspect}:Props) {
  const slot=useRef<HTMLDivElement>(null)
  const keyboardSource=useRef<HTMLButtonElement|null>(null)
  const pointer=useRef<{id:number; start:Point; lifted:boolean}|null>(null)
  const [drag,setDrag]=useState<Drag|null>(null)
  const [over,setOver]=useState(false)
  const [point,setPoint]=useState<Point|null>(null)

  function endDrag() {
    pointer.current=null
    setDrag(null)
    setOver(false)
    setPoint(null)
  }
  function acceptsNative(event:DragEvent) {
    return drag?.method==='native' && event.dataTransfer.types.includes(actorDragType)
  }
  function isInsideSlot(x:number,y:number) {
    const rect=slot.current?.getBoundingClientRect()
    return !!rect && x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom
  }
  function moveGrip(event:PointerEvent,actor:TesterActor) {
    const held=pointer.current
    if (!held || held.id!==event.pointerId) return
    const x=event.clientX,y=event.clientY
    if (!held.lifted) {
      if (Math.hypot(x-held.start.x,y-held.start.y)<8) return
      held.lifted=true
      setDrag({actor,method:'touch'})
    }
    setPoint({x,y})
    setOver(isInsideSlot(x,y))
  }
  function finishGrip(event:PointerEvent,actor:TesterActor) {
    const held=pointer.current
    if (!held || held.id!==event.pointerId) return
    if (held.lifted && isInsideSlot(event.clientX,event.clientY)) onCast(actor.id)
    endDrag()
  }
  function useSlotKey(event:KeyboardEvent) {
    if (drag?.method!=='keyboard' || !['Enter',' ','Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.repeat) return
    if (event.key!=='Escape') onCast(drag.actor.id)
    endDrag()
    keyboardSource.current?.focus({preventScroll:true})
  }

  const firstAvailable=candidates.find(actor=>!picks.includes(actor.id))
  return <div className="cast-tray">
    {drag ? <CastingTip target="slot" heading={'Cast '+drag.actor.name+' here.'}
      message={drag.method==='keyboard'?'Press Space or Enter to confirm. Escape cancels.':'Release over the outlined slot for '+roleName+'.'}/> :
     guideStep==='review' ? <CastingTip target="review" heading="Your cast is ready." message="Review your lineup and add a pitch for your choices."/> :
     guideStep==='actor' && firstAvailable ? <CastingTip key={firstAvailable.id} target="actor" heading={'Who plays '+roleName+'?'}
       message="Drag an actor into the outlined slot. On a phone, use the Drag handle." prefer="below"/> :
     guideStep==='role' ? <CastingTip target="role" heading={hasPicks?'Choose your next role.':'Choose a role.'}
       message={hasPicks?'Select another character to keep casting.':roleName+' is selected. You can start here or pick another character.'}/> : null}
    <p className="cast-instructions">
      Select a role, then drag <span className="mouse-instruction">an actor’s headshot</span><span className="touch-instruction">the Drag handle on an actor card</span> into the outlined slot.
    </p>
    <div ref={slot} data-casting-tip="slot" className={'cast-slot'+(drag?' ready':'')+(over?' over':'')}
      role="group" aria-label={'Casting slot for '+roleName} tabIndex={-1}
      onKeyDown={useSlotKey} onBlur={()=>{if(drag?.method==='keyboard') endDrag()}}
      onDragOver={event=>{
        if (!acceptsNative(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect='copy'
        setOver(true)
      }}
      onDragLeave={event=>{
        if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setOver(false)
      }}
      onDrop={event=>{
        if (!acceptsNative(event) || !drag) return
        event.preventDefault()
        if (event.dataTransfer.getData(actorDragType)===drag.actor.id) onCast(drag.actor.id)
        endDrag()
      }}>
      {pickedActor
        ? <ActorPortrait name={pickedActor.name} src={pickedActor.image} className="slot-photo" compact draggable={false}/>
        : <span className="slot-arrow" aria-hidden="true">↓</span>}
      <span className="slot-label"><small>Selected role</small><strong>{roleName}</strong></span>
      <span className="slot-action" aria-live="polite">{drag?.method==='keyboard'
        ? 'Press Space to cast '+drag.actor.name+' · Esc to cancel'
        : over && drag ? 'Release to cast '+drag.actor.name
        : pickedActor ? 'Drop to replace '+pickedActor.name : 'Drop an actor here'}</span>
    </div>
    <span className="casting-sr-only" id="actor-key-help">Press Space to pick up this actor. In the highlighted slot, press Space to drop or Escape to cancel.</span>
    <div className="actors">{candidates.map((actor,index)=>{
      const chosen=pickedActor?.id===actor.id
      const used=!chosen && picks.includes(actor.id)
      return <div className="candidate-card" key={actor.id}><button data-casting-tip={actor.id===firstAvailable?.id?'actor':undefined} type="button" disabled={used} draggable={!used}
        className={'actor-drag'+(chosen?' chosen':'')} aria-label={'Drag '+actor.name+' to cast '+roleName} aria-describedby="actor-key-help"
        onKeyDown={event=>{
          if (event.key!==' ' && event.key!=='Enter') return
          event.preventDefault()
          if (event.repeat || used) return
          keyboardSource.current=event.currentTarget
          setDrag({actor,method:'keyboard'})
          setOver(true)
          slot.current?.focus()
        }}
        onDragStart={event=>{
          if (used || pointer.current) {event.preventDefault();return}
          event.dataTransfer.setData(actorDragType,actor.id)
          event.dataTransfer.effectAllowed='copy'
          setDrag({actor,method:'native'})
        }}
        onDragEnd={endDrag}>
        <ActorPortrait name={actor.name} src={actor.image} className="candidate-photo" draggable={false} eager={index<6}/>
        {!used && <span className="actor-grip" aria-hidden="true"
          onPointerDown={event=>{
            if (event.pointerType==='mouse' || !event.isPrimary || pointer.current) return
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            pointer.current={id:event.pointerId,start:{x:event.clientX,y:event.clientY},lifted:false}
          }}
          onPointerMove={event=>moveGrip(event,actor)}
          onPointerUp={event=>finishGrip(event,actor)}
          onPointerCancel={endDrag} onLostPointerCapture={()=>{if (pointer.current) endDrag()}}>
          <i/>Drag
        </span>}
        <span className="actor-card-copy">
          <strong>{actor.name}</strong>
          {actor.birthYear&&<span className="actor-birth">Born {actor.birthYear}</span>}
          <small>{used?'Already cast':detailFor(actor)}</small>
        </span>
      </button>
      <button type="button" className="analysis-trigger" aria-haspopup="dialog" aria-label={'Actor analysis for '+actor.name}
        onClick={()=>onInspect(actor)}>Actor analysis</button>
      </div>
    })}</div>
    {point && drag?.method==='touch' && <span className="touch-drag-label" aria-hidden="true"
      style={{left:point.x,top:point.y}}>{drag.actor.name}</span>}
  </div>
}
