'use client'
import {createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState} from 'react'
import type {ReactNode} from 'react'
import type {SearchTarget} from './CastingSearchField'

const preferenceKey = 'wilderleague:casting-tips'
const TipsContext = createContext({enabled:false, change:(_value:boolean)=>{}})

export function CastingTipsProvider({children}:{children:ReactNode}) {
  const [enabled,setEnabled] = useState(false)
  useEffect(()=>{
    try {setEnabled(localStorage.getItem(preferenceKey)!=='off')}
    catch {setEnabled(true)}
  },[])
  const change = useCallback((value:boolean)=>{
    setEnabled(value)
    try {localStorage.setItem(preferenceKey,value?'on':'off')} catch {}
  },[])
  return <TipsContext.Provider value={{enabled,change}}>{children}</TipsContext.Provider>
}

export function useCastingTipsEnabled() {
  return useContext(TipsContext).enabled
}

export function TipsToggle() {
  const {enabled,change} = useContext(TipsContext)
  return <button type="button" className="tips-toggle" aria-pressed={enabled}
    onClick={()=>change(!enabled)}><span aria-hidden="true">?</span> Casting tips</button>
}

type Target = 'entry'|'format'|'search'|'title'|'role'|'actor'|'slot'|'review'|SearchTarget
type Side = 'above'|'below'|'right'

export function CastingTip({target,heading,message,prefer='above',onDismiss}:{
  target:Target; heading:string; message:string; prefer?:Side; onDismiss?:()=>void
}) {
  const {enabled,change} = useContext(TipsContext)
  const visible = enabled || Boolean(onDismiss)
  const dismiss = useCallback(()=>{if (onDismiss) onDismiss(); else change(false)},[change,onDismiss])
  const box = useRef<HTMLDivElement>(null)
  const uniqueId = useId()
  const id = onDismiss?target+'-instructions':uniqueId

  useLayoutEffect(()=>{
    if (!visible || !box.current) return
    const bubble = box.current
    const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-casting-tip="'+target+'"]'))
    const clipped=new Set<Element>()
    let frame = 0
    let described:HTMLElement|undefined
    function describe(next?:HTMLElement) {
      if (described===next) return
      if (described) {
        const ids=(described.getAttribute('aria-describedby')||'').split(/\s+/).filter(token=>token && token!==id)
        if (ids.length) described.setAttribute('aria-describedby',ids.join(' '))
        else described.removeAttribute('aria-describedby')
      }
      described=next
      if (next) next.setAttribute('aria-describedby',[next.getAttribute('aria-describedby'),id].filter(Boolean).join(' '))
    }
    function hide() {
      delete bubble.dataset.visible
      bubble.style.visibility='hidden'
      describe()
    }
    function position() {
      const anchor=anchors.find(el=>!clipped.has(el) && el.getClientRects().length>0)
      const rect=anchor?.getBoundingClientRect()
      const width=document.documentElement.clientWidth, height=window.innerHeight
      const margin=10, gap=23, bw=bubble.offsetWidth, bh=bubble.offsetHeight
      const cx=rect && rect.left+rect.width/2, cy=rect && rect.top+rect.height/2
      if (!rect || cx===undefined || cy===undefined || cy<0 || cy>height || cx<0 || cx>width) {
        hide()
        return
      }
      // Keep the welcome instructions clear of the last paragraph in the balloon.
      if (target==='entry' && rect.bottom+bh/2+margin>height) {hide();return}
      const roomRight=width-rect.right-gap-margin>=bw
      const roomAbove=rect.top-gap-margin>=bh
      const roomBelow=height-rect.bottom-gap-margin>=bh
      let side:Side
      if (prefer==='right' && roomRight) side='right'
      else if (prefer==='below' && roomBelow) side='below'
      else if (roomAbove) side='above'
      else if (roomBelow) side='below'
      else if (roomRight) side='right'
      else {hide();return}

      const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(value,max))
      const x=side==='right'?rect.right+gap:clamp(cx-bw/2,margin,width-bw-margin)
      const y=side==='right'?clamp(cy-bh/2,margin,height-bh-margin):
        side==='above'?rect.top-gap-bh:rect.bottom+gap
      const arrow=side==='right'?clamp(cy-y,18,bh-18):clamp(cx-x,18,bw-18)
      Object.assign(bubble.style,{left:x+'px',top:y+'px',visibility:'visible'})
      bubble.style.setProperty('--tip-point',arrow+'px')
      bubble.dataset.side=side
      bubble.dataset.visible=''
      describe(anchor)
    }
    function schedule() { cancelAnimationFrame(frame);frame=requestAnimationFrame(position) }
    function escape(event:KeyboardEvent) {
      if (event.key==='Escape' && !event.defaultPrevented && !document.querySelector('[aria-modal=true]') && bubble.style.visibility==='visible') dismiss()
    }
    function dismissOutside(event:Event) {
      const el=event.target
      if (el instanceof Element && !bubble.contains(el) && !el.closest('[data-search-controls="'+target+'"]')) dismiss()
    }
    if (onDismiss) {
      document.addEventListener('pointerdown',dismissOutside,true)
      document.addEventListener('focusin',dismissOutside,true)
    }
    const intersection=new IntersectionObserver(entries=>{
      for (const entry of entries) {
        if (entry.isIntersecting) clipped.delete(entry.target)
        else clipped.add(entry.target)
      }
      schedule()
    })
    for (const el of anchors) intersection.observe(el)
    position()
    const observer=new ResizeObserver(schedule)
    for (const el of [document.body,bubble,...anchors]) observer.observe(el)
    window.addEventListener('scroll',schedule,true)
    window.addEventListener('resize',schedule)
    document.addEventListener('keydown',escape)
    return ()=>{
      observer.disconnect()
      intersection.disconnect()
      document.removeEventListener('pointerdown',dismissOutside,true)
      document.removeEventListener('focusin',dismissOutside,true)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll',schedule,true)
      window.removeEventListener('resize',schedule)
      document.removeEventListener('keydown',escape)
      describe()
    }
  },[visible,target,heading,message,prefer,id,onDismiss,dismiss])

  if (!visible) return null
  return <div className="casting-tip" data-search-help={onDismiss?true:undefined} ref={box}>
    <div key={heading} className="tip-balloon">
      <div role="tooltip" id={id}><strong>{heading}</strong><p>{message}</p></div>
      <button type="button" className="tip-close" aria-label={onDismiss?'Close search help':'Hide casting tips'} onClick={()=>{
        if (onDismiss) document.querySelector<HTMLButtonElement>('[data-search-controls="'+target+'"] .search-help-button')?.focus({preventScroll:true})
        dismiss()
      }}>×</button>
    </div>
    <span className="tip-arrow" aria-hidden="true"><i>↓</i></span>
  </div>
}
