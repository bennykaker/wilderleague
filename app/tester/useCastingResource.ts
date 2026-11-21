'use client'
import {useEffect,useState} from 'react'

// Each catalogue request has its own deadline. A slow optional resource cannot
// hold the title roster or another resource's retry button open.
export function useCastingResource<T>(url:string,enabled:boolean,read:(body:unknown)=>T, timeoutMs=20000) {
  const [value,setValue] = useState<T|null>(null)
  const [failed,setFailed] = useState(false)
  const [attempt,setAttempt] = useState(0)
  useEffect(()=>{
    if (!enabled || value!==null) return
    const controller = new AbortController()
    setFailed(false)
    const deadline = window.setTimeout(()=>{
      controller.abort()
      setFailed(true)
    },timeoutMs)
    async function load() {
      try {
        const response = await fetch(url,{signal:controller.signal})
        if (!response.ok) throw new Error()
        const result = read(await response.json())
        if (!controller.signal.aborted) setValue(result)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      } finally {
        window.clearTimeout(deadline)
      }
    }
    void load()
    return ()=>{
      window.clearTimeout(deadline)
      controller.abort()
    }
  },[url,enabled,value,read,attempt,timeoutMs])
  return {value,failed,retry:()=>setAttempt(n=>n+1)}
}
