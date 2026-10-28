import type {TesterActor} from './model'
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const groups:Record<string,string[]>={
 angry:['angry','anger','rage','furious','fury','explosive','fiery','ferocious','intense','intensity'],
 funny:['funny','comedy','comic','comedic','humor','humour','witty','wit'],
 warm:['warm','warmth','gentle','gentleness','kindness','empathetic','empathy'],
 imposing:['imposing','commanding','authoritative','authority','gravitas','powerful'],
 unsettling:['unsettling','menacing','menace','sinister','uneasy','intimidating','brooding'],
 understated:['understated','subtle','subtlety','restrained','restraint','quiet','reserved'],
 charming:['charming','charm','charismatic','charisma','suave'],
 weary:['weary','weathered','tired','world-weary'],
 dramatic:['dramatic','drama'],romantic:['romantic','romance'],action:['action'],thriller:['thriller'],crime:['crime'],
}
const nationalities:Record<string,string[]>={irish:['irish','ireland'],british:['british','united kingdom','uk','english','england','scottish','scotland','welsh','wales','northern irish','northern ireland'],american:['american','united states','usa'],canadian:['canadian','canada'],australian:['australian','australia'],french:['french','france'],german:['german','germany'],italian:['italian','italy'],mexican:['mexican','mexico'],indian:['indian','india'],japanese:['japanese','japan'],korean:['korean','south korea'],spanish:['spanish','spain'],brazilian:['brazilian','brazil'],swedish:['swedish','sweden'],danish:['danish','denmark'],nigerian:['nigerian','nigeria']}
const ethnicityTerms=['latino','latina','latinx','hispanic','black','white','asian','indigenous','native american','middle eastern','south asian','east asian']
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
function has(text:string,term:string){return new RegExp('(^|[^a-z])'+escape(term)+'($|[^a-z])').test(normalize(text))}
export function extractDescriptionTags(keywords:string,profile:string):string[]{
 const text=normalize(keywords+'; '+profile),tags:string[]=[]
 for(const term of new Set(Object.values(groups).flat())){
  const re=new RegExp('(^|[^a-z])'+escape(term)+'(?=$|[^a-z])','g')
  for(const m of text.matchAll(re)){const before=text.slice(Math.max(0,(m.index||0)-35),m.index).split(/[.;!?]/).pop()||'';if(!/\b(not|never|without|lacks|no)\b(?:\W+\w+){0,3}\W*$/.test(before)){tags.push(term);break}}
 }
 return tags
}
export type DescriptionMatch={actor:TesterActor;reasons:string[]}
export function describeActors(actors:TesterActor[],query:string):{matches:DescriptionMatch[];unrecognized:string[]}{
 let rest=normalize(query).trim();if(!rest)return {matches:[],unrecognized:[]}
 const filters:{test:(a:TesterActor)=>string|null}[]=[]
 function consume(terms:string[]){let found=false;for(const term of [...terms].sort((a,b)=>b.length-a.length)){const re=new RegExp('(^|[^a-z])'+escape(term)+'(?=$|[^a-z])','g');if(re.test(rest)){found=true;rest=rest.replace(re,' ')}}return found}
 // Specific phrases precede their broader components.
 for(const term of [...ethnicityTerms].sort((a,b)=>b.length-a.length))if(consume([term]))filters.push({test:a=>has(a.ethnicity||'',term)?`Catalogue background: ${a.ethnicity}`:null})
 for(const [label,values] of Object.entries(nationalities))if(consume([label]))filters.push({test:a=>a.nationality.split(/[,;/|]/).some(n=>values.includes(normalize(n.trim())))?`Catalogue nationality: ${a.nationality}`:null})
 for(const [label,terms] of Object.entries(groups))if(consume(terms))filters.push({test:a=>{const found=(a.descriptionTags||[]).filter(t=>terms.includes(t));return found.length?`Performance description: ${found.slice(0,3).join(', ')}`:null}})
 if(consume(['actress','woman','female']))filters.push({test:a=>a.gender==='female'?'Catalogue: female':null})
 if(consume(['man','male']))filters.push({test:a=>a.gender==='male'?'Catalogue: male':null})
 rest=rest.replace(/\b(i|want|need|looking|look|find|me|for|an|a|the|actor|actors|someone|who|can|play|be|is|with|and|very|really|quite|sort|of|please|feel|feels|style|screen|presence)\b/g,' ')
 const unrecognized=rest.split(/[^a-z-]+/).filter(Boolean)
 if(!filters.length||unrecognized.length)return {matches:[],unrecognized}
 const matches=actors.flatMap(actor=>{const reasons=filters.map(f=>f.test(actor));return reasons.every(Boolean)?[{actor,reasons:reasons as string[]}]:[]})
 const relevantGroups=Object.values(groups).filter(terms=>terms.some(t=>has(query,t)))
 const exact=new Set(relevantGroups.flat().filter(t=>has(query,t)))
 const ranks=new Map(matches.map(({actor})=>[actor.id,relevantGroups.reduce((total,terms)=>total+(actor.descriptionTags||[]).filter(t=>terms.includes(t)).reduce((score,t)=>score+(exact.has(t)?20:Math.max(1,terms.length-terms.indexOf(t))),0),0)]))
 matches.sort((a,b)=>(ranks.get(b.actor.id)||0)-(ranks.get(a.actor.id)||0))
 return {matches,unrecognized:[]}
}
