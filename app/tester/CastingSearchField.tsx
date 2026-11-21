import type {ComponentProps} from 'react'

export type SearchTarget = 'actor-search' | 'character-search'

type Props = Pick<ComponentProps<'input'>, 'type' | 'value' | 'maxLength' | 'placeholder'> & {
  target:SearchTarget
  label:string
  helpOpen:boolean
  showHelp:(explicit:boolean)=>void
  closeHelp:()=>void
  onChange:(query:string)=>void
}

export default function CastingSearchField({target,label,helpOpen,showHelp,closeHelp,onChange,...input}:Props) {
  return <div className="casting-search-field" data-search-controls={target}>
    <div className="search-label-row">
      <label htmlFor={target}>{label}</label>
      <button type="button" className="search-help-button" aria-label={label+' help'} aria-expanded={helpOpen}
        aria-controls={helpOpen?target+'-instructions':undefined} aria-describedby={helpOpen?target+'-instructions':undefined}
        onClick={()=>helpOpen?closeHelp():showHelp(true)}>?</button>
    </div>
    <input {...input} id={target} data-casting-tip={target}
      onFocus={()=>{if (!input.value) showHelp(false)}}
      onPointerEnter={event=>{if (event.pointerType==='mouse' && !input.value) showHelp(false)}}
      onChange={event=>{closeHelp();onChange(event.target.value)}}/>
  </div>
}
