'use client'
import {AI_NAME,ASK_BIG_PUDDING} from '../../lib/big-pudding'
import {CastingTip,TipsToggle,useCastingTipsEnabled} from './CastingTips'
import CastingSearchField, {type SearchTarget} from './CastingSearchField'
import BoardBallot from './BoardBallot'
import {MIN_PASSWORD_LENGTH,MAX_PASSWORD_LENGTH} from '../../lib/tester/password'
import {hasLeaderboard,type Vote,type BoardCategory} from '../../lib/tester/leaderboard'
import ActorPortrait, {hasBundledPortrait} from './ActorPortrait'
import ActorCastingTray from './ActorCastingTray'
import ActorAnalysisDialog from './ActorAnalysis'
import CastingLibrary, {type PickerControls} from './CastingLibrary'
import RosterContribution from './RosterContribution'
import BringBack from './BringBack'
import Landing from './Landing'
import CastingFeedback from './CastingFeedback'
import {literaryChallenge,literaryTitles} from '../../lib/tester/books'
import {shuffleSuggestions} from '../../lib/tester/suggestions'
import {describeActors} from '../../lib/tester/description-search'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {JOURNEY_KEY,emptyJourney,restoreJourney,sampleResult,recordResult,continueJourney,type Journey} from '../../lib/tester/journey'
import {withChallenge,customChallenge} from '../../lib/tester/library-client'
import type {Catalogue,CastRecord,User,Challenge,TesterActor,TesterRole} from '../../lib/tester/model'
import './tester.css'
async function api(action:string,body?:unknown){const r=await fetch('/api/preview/'+action,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Please try again.'),{status:r.status});return data}
function OriginalPhoto({name,src}:{name:string;src:string}){
 return <ActorPortrait name={name} src={src} className="original-photo" compact/>
}
function CastCredit({role,actor}:{role:TesterRole;actor:TesterActor|undefined}){
 if(!actor)return null
 return <p className="cast-credit"><ActorPortrait name={actor.name} src={actor.image} className="credit-photo" compact/>
   <span><span>{role.name}</span><strong>{actor.name}</strong></span>
 </p>
}
const actorNameKey=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
type RoomProps = {
 data:Catalogue; publicMode?:boolean; initialMode:'library'|'guided'; initialTitle:string; picker:PickerControls
 preferBundledPhotos?:boolean; partialCatalogue:boolean; directoryFailed:boolean; retryDirectory:()=>void; retryFeatures?:()=>void
 onTutorial:()=>void; onRoomChange:(room:'library'|'guided')=>void
}
export default function TesterApp({data:initialData,publicMode=false,initialMode,initialTitle,picker,preferBundledPhotos=false,partialCatalogue,directoryFailed,retryDirectory,retryFeatures,onTutorial,onRoomChange}:RoomProps){
 const needsFullJourney=useRef(partialCatalogue)
 const [aiIdeas,setAiIdeas]=useState<{key:string;interpretation:string;matches:{id:string;reason:string}[]}|null>(null)
 const [aiBusy,setAiBusy]=useState(false)
 const [aiError,setAiError]=useState<{key:string;message:string;offerLogin:boolean}|null>(null)
 const [resumeSearch,setResumeSearch]=useState<string|null>(null)
 const [discoveryIntroDismissed,setDiscoveryIntroDismissed]=useState(false)
 const [suggestionSeed,setSuggestionSeed]=useState(0)
 function refreshSuggestions(){setSuggestionSeed(Math.floor(Math.random()*4294967296));setLimit(24)}
 const [inspectedActor,setInspectedActor]=useState<TesterActor|null>(null)
 const [actorTip,setActorTip]=useState(false)
 const tipsEnabled=useCastingTipsEnabled()
 const [searchHelp,setSearchHelp]=useState<SearchTarget|null>(null)
 const closeSearchHelp=useCallback(()=>setSearchHelp(null),[])
 function showSearchHelp(target:SearchTarget,explicit=false) {
  if (tipsEnabled || explicit) setSearchHelp(target)
 }
 const [roleToolsOpen,setRoleToolsOpen]=useState(false)
 const [searchMode,setSearchMode]=useState<'name'|'description'>('name')
 const [opened,setOpened]=useState<Challenge[]>([])
 const data=useMemo(()=>opened.reduce((current,c)=>current.challenges.some(x=>x.id===c.id)&&c.id!=='custom'&&!c.literary?current:withChallenge(current,c),initialData),[initialData,opened])
 function rememberRoster(c:Challenge){setOpened(previous=>[...previous.filter(x=>x.id!==c.id),c])}
 const [journey,setJourney]=useState<Journey>(emptyJourney),[guided,setGuided]=useState(initialMode==='guided'),[roleSearch,setRoleSearch]=useState('')
 const [user,setUser]=useState<User|null>(null),[view,setView]=useState<'home'|'cast'|'board'|'mine'|'result'>('home'),[challengeId,setChallengeId]=useState(data.challenges[0].id),[picks,setPicks]=useState<string[]>([]),[pitch,setPitch]=useState(''),[role,setRole]=useState(0),[search,setSearch]=useState(''),[limit,setLimit]=useState(24),[records,setRecords]=useState<CastRecord[]>([]),[category,setCategory]=useState<'best'|'hear'>('best'),[saved,setSaved]=useState<CastRecord|null>(null),[auth,setAuth]=useState(false),[register,setRegister]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false)
 useEffect(()=>{if(!auth)return;const previous=document.activeElement as HTMLElement|null;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setResumeSearch(null);setAuth(false)}if(e.key==='Tab'){const controls=Array.from(document.querySelectorAll<HTMLElement>('.tester .modal button:not(:disabled), .tester .modal input'));const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);previous?.focus()}},[auth])
 const challenge=data.challenges.find(c=>c.id===challengeId)!,actors=useMemo(()=>new Map(data.actors.map(a=>[a.id,a])),[data]),complete=picks.length===challenge.roles.length&&picks.every(Boolean),filledRoles=challenge.roles.filter((_,i)=>picks[i]),canSave=challenge.literary?filledRoles.length>0:complete,payload={challengeId,picks:challenge.literary?picks.filter(Boolean):picks,pitch,publish:false,...(challenge.literary?{roleIds:filledRoles.map(r=>r.id)}:{}),...(challengeId==='custom'?{custom:{title:challenge.title,kind:challenge.season.split(' ')[1],roles:challenge.roles.map(r=>r.name)}}:{})}
 const actorsByName=useMemo(()=>new Map(data.actors.map(a=>[actorNameKey(a.name),a])),[data.actors])
 const originalActor=actorsByName.get(actorNameKey(challenge.roles[role]?.originalActor||''))
 const originalImage=(r:typeof challenge.roles[number])=>r.originalImage||actorsByName.get(actorNameKey(r.originalActor))?.image||''
 const descriptionAvailable=challengeId!==initialData.challenges[0].id
 const description=descriptionAvailable&&searchMode==='description'
 const eligibleActors=useMemo(()=>{const eligible=new Set(data.pools[challengeId]);return data.actors.filter(a=>eligible.has(a.id))},[data,challengeId])
 const mixedActors=useMemo(()=>{
  const shuffled=shuffleSuggestions(eligibleActors,suggestionSeed+role*2654435761)
  if(preferBundledPhotos)shuffled.sort((a,b)=>Number(hasBundledPortrait(b.name))-Number(hasBundledPortrait(a.name)))
  return shuffled
 },[eligibleActors,suggestionSeed,role,preferBundledPhotos])
 const pickedActor=actors.get(picks[role])
 const descriptionQuery=description?search:''
 const suggestions=useMemo(()=>describeActors(eligibleActors,descriptionQuery),[eligibleActors,descriptionQuery])
 const activeAI=description&&aiIdeas?.key===challengeId+':'+search?aiIdeas:null
 async function searchAI(){const key=challengeId+':'+search;setAiBusy(true);setAiError(null);try{const d=await api('ai-search',{challengeId,query:search,...(payload.custom?{custom:payload.custom}:{})});setAiIdeas({...d,key});setLimit(24)}catch(e){const {message,status}=e as Error&{status?:number};setAiError({key,message,offerLogin:status===401 || (status===429 && message.includes('guest AI searches'))})}finally{setAiBusy(false)}}
 const reasons=new Map(suggestions.matches.map(m=>[m.actor.id,m.reasons.join(' · ')]))
 const nameQuery=description?'':actorNameKey(search)
 const matchingNames=useMemo(()=>nameQuery?eligibleActors.filter(actor=>actorNameKey(actor.name).includes(nameQuery)):[],[eligibleActors,nameQuery])
 const pool=activeAI?activeAI.matches.map(m=>actors.get(m.id)!).filter(Boolean):!search.trim()?mixedActors:description?suggestions.matches.map(m=>m.actor):matchingNames
 async function run(fn:()=>Promise<void>){setBusy(true);setNotice('');try{await fn()}catch(e){setNotice((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{refreshSuggestions();let restored=emptyJourney();try{if(publicMode||new URLSearchParams(location.search).get('landing')!=='1')restored=restoreJourney(localStorage.getItem(JOURNEY_KEY),initialData)}catch{}setJourney(restored);setGuided(initialMode==='guided'&&restored.stage<3);const result=initialMode==='guided'&&restored.results[restored.stage];if(result){setChallengeId(result.challengeId);setPicks(result.picks);setPitch(result.pitch);setView('result')}
 api('me').then(d=>setUser(d.user)).catch(()=>setNotice('Account service unavailable. You can still build a cast.'));const id=new URLSearchParams(location.search).get('cast');const slug=initialTitle||new URLSearchParams(location.search).get('title');if(id)api('cast?id='+encodeURIComponent(id)).then(d=>openCast(d.cast)).catch(e=>setNotice(e.message));else if(slug)void openTitle(slug);else {const params=new URLSearchParams(location.search);const board=params.get('board');if(board)openBoard(board,params.get('category')==='hear'?'hear':'best')}},[])
 useEffect(()=>{
  if(partialCatalogue||!needsFullJourney.current)return
  needsFullJourney.current=false
  try {setJourney(restoreJourney(localStorage.getItem(JOURNEY_KEY),initialData))} catch {}
 },[partialCatalogue,initialData])
 useEffect(()=>{
  if(partialCatalogue || view!=='cast')return
  const eligible=new Set(data.pools[challengeId])
  if(picks.some(id=>id && !eligible.has(id))){
   setPicks(previous=>previous.map(id=>eligible.has(id)?id:''))
   setNotice('A saved actor is no longer in this casting pool. Choose a replacement for that role.')
  }
 },[partialCatalogue,data.pools,challengeId,picks,view])
 useEffect(()=>{if(view==='cast'&&ready){try{localStorage.setItem('wl-tester:'+challengeId,JSON.stringify({picks,pitch,roleIds:challenge.literary?challenge.roles.map(r=>r.id):undefined}))}catch{}}},[view,ready,challengeId,picks,pitch])
 const [boardId,setBoardId]=useState(initialData.challenges[0].id)
 const [listState,setListState]=useState<'loading'|'ready'|'failed'>('loading')
 const boardBooks=useMemo(()=>(data.titles||literaryTitles).filter(t=>t.type==='book').sort((a,b)=>a.title.localeCompare(b.title)),[data.titles])
 const boardBook=boardBooks.find(t=>'free:'+t.slug===boardId)
 const boardTitle=boardBook?.title || initialData.challenges.find(c=>c.id===boardId)?.title
 function openBoard(id:string,selected:BoardCategory='best') {
  if(view!=='board')window.scrollTo(0,0)
  setGuided(false);setView('board');setNotice('');setBoardId(id);setCategory(selected)
  if(location.protocol!=='file:')history.replaceState(null,'',location.pathname+'?'+new URLSearchParams({board:id,category:selected}))
 }
 function castBoardTitle() {
  if(boardId.startsWith('free:'))void openTitle(boardId.slice(5))
  else if(initialData.challenges.some(c=>c.id===boardId))start(boardId)
 }
 const [boardRevision,setBoardRevision]=useState(0)
 useEffect(()=>{if(view!=='board'&&view!=='mine')return;let active=true;setListState('loading');setRecords([]);api(view==='mine'?'mine':`board?challenge=${encodeURIComponent(boardId)}&category=${category}`).then(d=>{if(active){setRecords(d.casts);setListState('ready')}}).catch(e=>{if(active){setNotice(e.message);setListState('failed')}});return()=>{active=false}},[view,boardId,category,user,boardRevision])
 function start(id:string,override?:Challenge){if(new URLSearchParams(location.search).has('board'))history.replaceState(null,'',location.pathname);closeSearchHelp();setActorTip(false);setRoleToolsOpen(false);setRoleSearch('');refreshSuggestions();const c=override||data.challenges.find(c=>c.id===id)!;let draft={picks:Array(c.roles.length).fill('') as string[],pitch:''};try{const d=JSON.parse(localStorage.getItem('wl-tester:'+id)||'null');if(id!=='custom'&&d&&Array.isArray(d.picks)&&(d.picks.length===c.roles.length || c.literary&&Array.isArray(d.roleIds))){const eligible=new Set(data.pools[id]||data.actors.map(a=>a.id));const stored=c.literary&&Array.isArray(d.roleIds)?c.roles.map(r=>d.picks[d.roleIds.indexOf(r.id)]):d.picks;draft={picks:stored.map((v:unknown)=>typeof v==='string'&&(partialCatalogue||eligible.has(v))?v:''),pitch:typeof d.pitch==='string'?d.pitch.slice(0,1000):''}}}catch{}setSearchMode(id===initialData.challenges[1].id?'description':'name');setChallengeId(id);setPicks(draft.picks);setPitch(draft.pitch);setRole(Math.max(0,draft.picks.findIndex(x=>!x)));setSaved(null);setSearch('');setLimit(24);setReady(true);setView('cast');setNotice('')}
 async function openCast(c:CastRecord) {if(view==='board'&&location.protocol!=='file:')history.replaceState(null,'',location.pathname+'?cast='+encodeURIComponent(c.id));closeSearchHelp();setActorTip(false);setRoleToolsOpen(false);
  let roster=c.snapshot.challenge
  if(roster.literary || (!roster.libraryType && c.challengeId.startsWith('free:') && data.titles?.some(t=>t.type==='book' && 'free:'+t.slug===c.challengeId))) {
    try {const slug=c.challengeId.slice(5);roster=literaryChallenge(slug)||(await api('title?slug='+encodeURIComponent(slug))).challenge}
    catch {setNotice('Showing the roster saved with this cast.')}
  }
  refreshSuggestions();setRoleSearch('')
  if(!data.challenges.some(x=>x.id===c.challengeId)||c.challengeId==='custom'||roster.literary)rememberRoster(roster)
  setGuided(false);setSearchMode('name');setChallengeId(c.challengeId)
  const allowed=new Set(data.pools[c.challengeId]||data.actors.map(a=>a.id))
  const castByRole=new Map(c.snapshot.challenge.roles.map((r,i)=>[r.id,c.snapshot.actors[i]?.id]))
  const restored=roster.roles.map(r=>{const id=castByRole.get(r.id);return id&&(partialCatalogue||allowed.has(id))?id:''})
  if(!partialCatalogue&&c.snapshot.actors.some(a=>!allowed.has(a.id)))setNotice('Some saved actors are no longer eligible. Choose replacements for their roles.')
  setPicks(restored);setPitch(c.snapshot.pitch);setSaved(c);setRole(Math.max(0,restored.findIndex(Boolean)));setSearch('');setReady(false);setView('cast')
 }
 function accountNeeded(){if(user)return false;setAuth(true);return true}
 async function save(publish:boolean){if(accountNeeded())return;await run(async()=>{const d=await api('save',{...payload,publish});setSaved(d.cast);setNotice(publish?(hasLeaderboard(challenge)?(d.judging==='ready'?'Submitted and scored on both boards.':d.judging==='budget'?'Submitted. The daily judging budget is used up. Resubmit tomorrow for a score.':`Submitted. Voting is open while ${AI_NAME}’s score is unavailable.`):'Your cast is now shared. Copy the link below.'):'Saved privately to your account.')})}
 async function download(kind:'image'|'analysis'){await run(async()=>{const r=await fetch('/api/preview/export-'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error((await r.json()).error);const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download=challengeId+(kind==='image'?'-cast.png':'-analysis.txt');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(kind==='image'?'Image downloaded. Attach it to your Facebook post.':'Cast pack downloaded. Attach it in your AI, then bring its JSON response back here.')})}
 async function vote(c:CastRecord,direction:Vote){
  if(accountNeeded())return
  await run(async()=>{await api('vote',{id:c.id,category,direction});setBoardRevision(n=>n+1)})
 }
 function remember(next:Journey){setJourney(next);try{localStorage.setItem(JOURNEY_KEY,JSON.stringify(next))}catch{setNotice('Progress cannot be saved in this browser. Keep this tab open.')}}
 function home(){setGuided(false);onRoomChange('library');setView('home');setNotice('');if(location.search)history.replaceState(null,'',location.pathname);window.scrollTo(0,0)}
 function showResult(){try{const result=sampleResult(payload,data);remember(recordResult(journey,result));setView('result');window.scrollTo({top:0,behavior:'smooth'})}catch(e){setNotice((e as Error).message)}}
 function nextChallenge(){const next=continueJourney(journey);remember(next);if(next.stage<3){setGuided(true);start(data.challenges[next.stage].id)}else{home()}window.scrollTo({top:0,behavior:'smooth'})}
 function launch(c:Challenge){window.scrollTo(0,0);rememberRoster(c);setGuided(false);start(c.id,c)}
 async function openTitle(slug:string){
  await run(async()=>{
   const roster=literaryChallenge(slug)||(await api('title?slug='+encodeURIComponent(slug))).challenge
   launch(roster)
   if(location.protocol!=='file:')history.replaceState(null,'',location.pathname+'?title='+encodeURIComponent(slug))
  })
 }
 function castActor(actorId:string) {
  if (picks.includes(actorId)) return
  setActorTip(false)
  setPicks(previous=>previous.map((pick,i)=>i===role?actorId:pick))
  setReady(true)
  setSaved(null)
 }
 function selectCastingRole(index:number) {
  setActorTip(true)
  setRole(index)
  setSearch('')
  setLimit(24)
 }
 const visibleRoles=challenge.roles.map((r,i)=>({r,i})).filter(({r})=>r.name.toLowerCase().includes(roleSearch.trim().toLowerCase()))
 const selectedRoleVisible=visibleRoles.some(item=>item.i===role)
 function beginGuided(){if(location.search)history.replaceState(null,'',location.pathname);remember(emptyJourney());setGuided(true);onRoomChange('guided');start(initialData.challenges[0].id);window.scrollTo(0,0)}
 return <div className={'tester'+(view==='cast'?' casting-screen':'')}><header><button className="brand plain" onClick={home}>WilderLeague</button><nav><button onClick={home}>Casting room</button><button id="open-casting-tutorial" onClick={onTutorial}>Quick tutorial</button><button onClick={()=>openBoard(view==='cast'&&hasLeaderboard(challenge)?challengeId:boardId)}>Leaderboards</button>{user?<><button onClick={()=>setView('mine')}>My casts</button><button onClick={()=>run(async()=>{await api('logout',{});setUser(null);setSaved(null);home()})}>Sign out · {user.username}</button></>:<button onClick={()=>{setNotice('');setRegister(false);setAuth(true)}}>Sign in</button>}</nav></header>
 <main>{notice&&<div className="notice" role="status">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice('')}>×</button></div>}
 {view==='home'&&guided&&journey.stage<3&&<section className="opening"><p className="eyebrow">CHALLENGE {journey.stage+1} OF 3</p><h1>{journey.stage===0?'Who would you cast?':data.challenges[journey.stage].title}</h1><p>{journey.stage===0?'Reboot Breaking Bad today. Choose a living SNL cast member for Walter, Jesse and Skyler. Every role is open to any gender.':data.challenges[journey.stage].rule}</p><article><h2>{data.challenges[journey.stage].title}</h2><p>{data.challenges[journey.stage].season} · {data.challenges[journey.stage].roles.length} roles</p>{journey.stage===0&&<div className="opening-roles">{data.challenges[0].roles.map(r=><div key={r.id}><div className="opening-original"><OriginalPhoto key={originalImage(r)} name={r.originalActor} src={originalImage(r)}/><div><strong>{r.name}</strong><small>{r.originalActor}</small></div></div><p>{r.description}</p></div>)}</div>}<button className="primary" onClick={()=>{setGuided(true);start(data.challenges[journey.stage].id)}}>{journey.stage===0?'Cast the three roles':'Continue casting'} →</button></article><p className="muted">Try the opening challenges at your own pace. You can enter the casting room at any time.</p><p className="sample-label">The opening results use fixed sample scores to demonstrate the flow. They do not assess your choices.</p></section>}
 {view==='home'&&(!guided||journey.stage===3)&&<><CastingLibrary titles={data.titles||[]} open={openTitle} busy={busy} {...picker}/><section className="library-extras"><details><summary>Casting challenges</summary>{retryFeatures&&<button onClick={retryFeatures}>Retry loading more challenges</button>}<div className="challenges">{initialData.challenges.map(c=><article key={c.id}><p className="eyebrow">{c.roles.length} ROLES</p><h2>{c.title}</h2><p>{c.rule}</p><p className="muted">{c.season}</p><button onClick={()=>{setGuided(false);start(c.id)}}>Cast the reboot →</button></article>)}</div></details><details><summary>Add your own title</summary><form className="custom-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{launch(customChallenge({title:f.get('title'),kind:f.get('kind'),roles:String(f.get('roles')).split('\n').map(s=>s.trim()).filter(Boolean)}))}catch(err){setNotice((err as Error).message)}}}><label>Title<input name="title" required maxLength={120}/></label><label>Format<select name="kind"><option value="show">Show</option><option value="book">Book</option><option value="movie">Film</option></select></label><label>Characters · one per line<textarea name="roles" required placeholder={'Character one\nCharacter two\nCharacter three'}/></label><p className="muted">1–30 characters per cast. You can create as many casts as you like.</p><button className="primary">Start casting</button></form></details></section><details className="journey-replay"><summary>Opening challenges and results</summary><p className="sample-label">Sample scores only. These were not AI assessments and do not count toward leaderboards.</p>{journey.results.map(r=><p key={r.challengeId}>{data.challenges.find(c=>c.id===r.challengeId)?.title}: {r.score}/100</p>)}<button disabled={partialCatalogue} onClick={beginGuided}>Play the opening challenges</button></details>{!publicMode&&<details><summary>More casting ideas</summary><Landing actors={data.actors} onStart={beginGuided}/></details>}</>}
 {view==='result'&&<section className="sample-result"><p className="eyebrow">CHALLENGE {journey.stage+1} OF 3 COMPLETE</p><h1>{challenge.title}</h1><div className="score"><span>Sample score</span><strong>{journey.results[journey.stage]?.score}<small>/100</small></strong></div><p className="sample-label">This is a fixed demonstration score, not a judgment of your cast. This score does not use AI or enter the leaderboards. You can ask {AI_NAME} for a written review below.</p><div className="cast-summary">{challenge.roles.map((r,i)=><CastCredit key={r.id} role={r} actor={actors.get(picks[i])}/>)}</div><div className="actions result-actions"><button className="primary" onClick={nextChallenge}>{journey.stage<2?`Continue to ${data.challenges[journey.stage+1].title}`:'Explore all challenges'} →</button><button onClick={()=>setView('cast')}>Review my choices</button></div><><CastingFeedback key={JSON.stringify(payload)} payload={payload}/><BringBack key={JSON.stringify(payload)} snapshot={{challenge,actors:picks.map(id=>actors.get(id)!),pitch:pitch.trim()}} catalogue={data} onApply={next=>{setPicks(next);setReady(true);setSaved(null);setView('cast');setNotice('Accepted AI suggestions applied to your draft. Save when you are ready.')}}/></><details><summary>Save or export this cast</summary><div className="actions"><button disabled={busy} onClick={()=>save(false)}>Save privately</button><button disabled={busy} onClick={()=>download('image')}>Download cast image</button><button disabled={busy} onClick={()=>download('analysis')}>Take this cast to your AI</button></div></details></section>}
 {view==='cast'&&<>
 {searchHelp==='character-search'&&<CastingTip target="character-search" heading="Who are you casting?"
   message="Type part of a character’s name to narrow the role list. Choose the character, then find an actor to play them." onDismiss={closeSearchHelp}/>}
 {searchHelp==='actor-search'&&<CastingTip target="actor-search" heading={description?'Have a type in mind?':'Know the actor’s name?'}
   message={description?`Try “warm and funny” for instant matches. For “a Chris Traeger type,” choose “${ASK_BIG_PUDDING}”.`+(user?'':' Sign in to run a new AI search.'):
     'Type a first or last name to narrow the actor pool. Drag a matching actor into the selected role.'} onDismiss={closeSearchHelp}/>}
 <div className="casting-navigation">
   <button className="plain" onClick={()=>guided?setView('home'):home()}>{guided?'← Introduction':'← Casting room'}</button>
   <TipsToggle/>
   {hasLeaderboard(challenge)&&<button onClick={()=>openBoard(challengeId)}>{challengeId.startsWith('free:')?'Book leaderboards':'Challenge leaderboards'}</button>}
   <button className="role-tools-toggle" aria-controls="role-search-panel" aria-expanded={roleToolsOpen} onClick={()=>setRoleToolsOpen(open=>!open)}>Role &amp; actor search</button>
 </div>
 <div className="casting"><div className="casting-intro">{guided&&<p className="eyebrow">OPENING CHALLENGE {journey.stage+1} OF 3</p>}<div className="section-title"><div><p className="eyebrow">{challenge.season} · {picks.filter(Boolean).length}/{challenge.roles.length} CAST</p><h1>{challenge.title}</h1><p>{challenge.rule}</p></div>{challenge.source&&<a href={challenge.source} target="_blank" rel="noreferrer">Roster reference ↗</a>}</div>{challenge.id.startsWith('free:')&&<section className="roster-tools">{challenge.literary?.kind==='book'&&challenge.literary.universeSlug&&<button className="plain" disabled={busy} onClick={()=>openTitle(challenge.literary!.universeSlug!)}>Cast the {challenge.literary.universe} universe</button>}{challenge.literary?.books&&<details><summary>Books in this universe ({challenge.literary.books.length})</summary><ul className="source-list">{challenge.literary.books.map(b=><li key={b.slug}><button className="plain" onClick={()=>openTitle(b.slug)} disabled={busy}>{b.title}</button> · <a href={b.source} target="_blank" rel="noreferrer">Book reference</a></li>)}</ul></details>}<RosterContribution key={challenge.id} challenge={challenge} roleName={challenge.roles[role].name}/></section>}
 {saved?.published&&challenge.literary&&<details className="shared-lineup" open><summary>{saved.username}’s shared cast · {saved.snapshot.actors.length} {saved.snapshot.actors.length===1?'pick':'picks'}</summary><div className="cast-summary">{saved.snapshot.challenge.roles.map((r,i)=><CastCredit key={r.id} role={r} actor={saved.snapshot.actors[i]}/>)}</div>{saved.snapshot.pitch&&<blockquote>{saved.snapshot.pitch}</blockquote>}</details>}
 {challenge.literary&&filledRoles.length>0&&<div className="draft-bar"><button onClick={()=>document.getElementById('finish-casting')?.scrollIntoView({block:'start'})}>Review {filledRoles.length} {filledRoles.length===1?'pick':'picks'}</button></div>}
 </div>
 <div className={challenge.literary?'casting-roster roster-pane':'casting-roster'}>{challenge.literary&&challenge.roles.length>10&&<CastingSearchField
   target="character-search" label="Find a character" type="search" value={roleSearch} placeholder="Character name"
   helpOpen={searchHelp==='character-search'} showHelp={explicit=>showSearchHelp('character-search',explicit)}
   closeHelp={closeSearchHelp} onChange={setRoleSearch}/>}
 <label className="mobile-role-picker">Role
   <select data-casting-tip="role" value={selectedRoleVisible?String(role):''} onChange={e=>selectCastingRole(Number(e.target.value))}>
     {!selectedRoleVisible&&<option value="" disabled>{visibleRoles.length?'Choose a matching role':'No matching characters'}</option>}
     {visibleRoles.map(({r,i})=><option key={r.id} value={i}>{i+1}. {r.name}{picks[i]?' — '+(actors.get(picks[i])?.name||'Cast'):''}</option>)}
   </select>
 </label>
 <aside aria-label="Roles">{visibleRoles.map(({r,i})=><button
   data-casting-tip={i===(picks[role]?picks.findIndex(p=>!p):role)?'role':undefined}
   className={'role '+(i===role?'selected':'')} key={r.id} aria-pressed={i===role}
   onClick={()=>selectCastingRole(i)}>{!challenge.literary&&<OriginalPhoto key={originalImage(r)} name={r.originalActor} src={originalImage(r)}/>}<span className="role-label">{i===role&&<span className="active-role-label">Selected</span>}<span>{i+1}. {r.name}</span>{r.originalActor&&<small>Original: {r.originalActor}</small>}<strong>{actors.get(picks[i])?.name||(picks[i]?'Saved actor pick':'Choose an actor')}</strong></span>{actors.get(picks[i])&&<ActorPortrait name={actors.get(picks[i])!.name} src={actors.get(picks[i])!.image} className="role-pick-photo" compact/>}</button>)}{!visibleRoles.length&&<p>No matching characters.</p>}</aside></div>
 <section id="role-search-panel" aria-label="Role details and actor search" className={'role-search-panel'+(roleToolsOpen?' expanded':'')}>
 <div className="original-role-heading"><div><h2>{challenge.roles[role].name}</h2>
 <div className="role-performers">{challenge.roles[role].originalActor&&<div>
   <ActorPortrait name={challenge.roles[role].originalActor} src={originalImage(challenge.roles[role])} className="role-headshot" eager/>
   <span><small>Original cast</small><strong>{challenge.roles[role].originalActor}</strong>{originalActor&&<button type="button" className="analysis-trigger" aria-label={'Original cast analysis for '+originalActor.name} aria-haspopup="dialog" onClick={()=>setInspectedActor(originalActor)}>Actor analysis</button>}</span>
 </div>}{pickedActor&&<div>
   <ActorPortrait name={pickedActor.name} src={pickedActor.image} className="role-headshot" eager/>
   <span><small>Your pick</small><strong>{pickedActor.name}</strong><button type="button" className="analysis-trigger" aria-label={'Your pick analysis for '+pickedActor.name} aria-haspopup="dialog" onClick={()=>setInspectedActor(pickedActor)}>Actor analysis</button></span>
 </div>}</div></div>{challenge.literary&&picks[role]&&<button className="plain" onClick={()=>{setPicks(existing=>existing.map((id,i)=>i===role?'':id));setSaved(null);setReady(true)}}>Clear this pick</button>}</div><p>{challenge.roles[role].description}</p>{descriptionAvailable&&<section className="actor-discovery">{guided&&journey.stage===1&&!discoveryIntroDismissed&&<><div className="discovery-intro-title"><p className="eyebrow">NEW IN THIS CHALLENGE</p><button className="plain" aria-label="Dismiss description search introduction" onClick={()=>setDiscoveryIntroDismissed(true)}>×</button></div><h3>Describe the actor you have in mind.</h3><p>You don’t need a name. Try a background, nationality or performance style, then choose from the matches.</p></>}<div className="actions" data-search-controls="actor-search"><button aria-pressed={!description} className={!description?'primary':''} onClick={()=>{setSearchMode('name');setSearch('');setLimit(24);showSearchHelp('actor-search')}}>Search by name</button><button aria-pressed={description} className={description?'primary':''} onClick={()=>{setSearchMode('description');setSearch('');setLimit(24);showSearchHelp('actor-search')}}>Describe an actor</button></div></section>}<CastingSearchField
   target="actor-search" label={description?'Describe an actor':'Find an actor'} value={search} maxLength={200}
   placeholder={description?'e.g. Irish actor, Latino actor, angry and intense':'First or last name'}
   helpOpen={searchHelp==='actor-search'} showHelp={explicit=>showSearchHelp('actor-search',explicit)}
   closeHelp={closeSearchHelp} onChange={query=>{setSearch(query);setLimit(24)}}/>{description&&<><div className="description-examples">{['Irish actor','Latino actor','Angry actor','Warm and funny'].map(q=><button key={q} onClick={()=>{setSearch(q);setLimit(24)}}>{q}</button>)}</div><div className="actions"><button disabled={aiBusy||!search.trim()} onClick={searchAI}>{aiBusy?`${AI_NAME} is looking for actors…`:ASK_BIG_PUDDING}</button></div>{aiError?.key===challengeId+':'+search&&<p role="status">{aiError.message} {!user&&aiError.offerLogin&&<button className="text-link" onClick={()=>{setResumeSearch(challengeId+':'+search);setRegister(false);setNotice('');setAuth(true)}}>Sign in and search</button>}</p>}<p className="muted">Try “Ron Swanson type” or “a younger, warmer Sherlock.” {AI_NAME} interprets your reference. Press the button to send your phrase to Anthropic and see which suggestions match this actor pool. Anyone can use saved searches. Fresh searches share a site limit of 50 per day, resetting at midnight UTC. Members get up to 5 per account.</p>{activeAI&&<p role="status"><strong>{AI_NAME}’s take</strong> — {activeAI.interpretation}{!activeAI.matches.length&&' No suggestions matched this challenge’s eligible catalogue. Try a broader reference.'}</p>}<p className="muted">Ordinary search matches existing catalogue descriptions. Style describes screen performances, not someone’s personality. Suggestions stay within this challenge’s actor pool.</p>{!activeAI&&suggestions.unrecognized.length>0&&<p role="status">I can’t match “{suggestions.unrecognized.join(' ')}” yet. Try a nationality, background or style like warm, funny, intense or understated.</p>}</>}
 </section>
 <section className="actor-pool" aria-label="Actor pool">
 {guided&&complete&&<div className="completed-cast"><span>All roles cast.</span><button className="primary" onClick={showResult}>See sample score →</button></div>}
 {partialCatalogue&&<p className="muted" role="status">
   {directoryFailed?'The full list couldn’t load.':'Loading the full actor list…'} You can cast with the starter actors now.
   {directoryFailed&&<> <button className="plain" onClick={retryDirectory}>Retry full actor list</button></>}
 </p>}
 <div className="pool-toolbar"><p className="muted">{search.trim() && <>{pool.length.toLocaleString('en-US')} {pool.length===1?'match':'matches'} · </>}
   {eligibleActors.length.toLocaleString('en-US')} {partialCatalogue?'starter actors available':'actors in this pool'}.
 </p>{!search.trim()&&<button className="plain" onClick={refreshSuggestions}>Show a different mix ↻</button>}</div>
 {complete&&<a className="review-cast-link" data-casting-tip="review" href="#finish-casting">Review your cast ↓</a>}
 <ActorCastingTray guideStep={searchHelp?null:complete?'review':actorTip?'actor':'role'} hasPicks={filledRoles.length>0} key={challenge.id+'/'+challenge.roles[role].id} candidates={pool.slice(0,limit)}
   onInspect={setInspectedActor} roleName={challenge.roles[role].name} pickedActor={pickedActor} picks={picks} onCast={castActor}
   detailFor={a=>activeAI?activeAI.matches.find(m=>m.id===a.id)?.reason:description&&search.trim()?reasons.get(a.id):a.knownFor||a.nationality}/>
 {!pool.length&&<p>{description?'No catalogue matches in this actor pool. Try a broader description or switch to name search.':'No matches. Try another name.'}</p>}{pool.length>limit&&<button onClick={()=>setLimit(limit+24)}>Show more actors</button>}</section></div><section id="finish-casting" className="finish"><h2>{canSave?'Your cast':'Make your case'}</h2>{challenge.literary&&<p className="muted">Your draft keeps your place on this device. You can share after casting one role.</p>}{filledRoles.length>0&&<div className="cast-summary">{challenge.roles.map((r,i)=>picks[i]&&<CastCredit key={r.id} role={r} actor={actors.get(picks[i])}/>)}</div>}<label>Why these choices? <span className="muted">Optional · {pitch.length}/1,000</span><textarea value={pitch} maxLength={1000} placeholder="Tell people what you see in this cast." onChange={e=>{setPitch(e.target.value);setReady(true);setSaved(null)}}/></label>{guided?<div className="actions"><button className="primary" disabled={!complete||busy} onClick={showResult}>Finish cast & see sample score →</button></div>:<div className="actions"><button disabled={!canSave||busy} onClick={()=>save(false)}>Save privately</button><button className="primary" disabled={!canSave||busy} onClick={()=>save(true)}>{initialData.challenges.some(c=>c.id===challengeId)?'Submit to leaderboards':'Share this cast'}</button><button disabled={!canSave||busy} onClick={()=>download('image')}>Download cast image</button><button disabled={!canSave||busy} onClick={()=>download('analysis')}>Take this cast to your AI</button></div>}{complete&&<><CastingFeedback key={JSON.stringify(payload)} payload={payload}/><BringBack key={JSON.stringify(payload)} snapshot={{challenge,actors:picks.map(id=>actors.get(id)!),pitch:pitch.trim()}} catalogue={data} onApply={next=>{setPicks(next);setReady(true);setSaved(null);setView('cast');setNotice('Accepted AI suggestions applied to your draft. Save when you are ready.')}}/></>}{!complete&&!challenge.literary&&<p>Choose all {challenge.roles.length} roles to finish your cast.</p>}{guided?<p className="sample-label">Sample scores demonstrate the flow; they do not assess your choices. No account required.</p>:<p className="muted">Saving is private. Sharing makes your cast and username visible to other users. {hasLeaderboard(challenge)&&<>Sharing this cast enters it on both the Best Cast and Hear Me Out boards and sends the cast and rationale to Anthropic so {AI_NAME} can score both categories.</>}</p>}{saved?.published&&hasLeaderboard(challenge)&&<button onClick={()=>openBoard(challengeId)}>View this leaderboard</button>}{saved?.published&&<button onClick={()=>run(async()=>{await navigator.clipboard.writeText(`${location.origin}/tester?cast=${saved.id}`);setNotice('Cast link copied. Share it with someone to show them your cast.')})}>Copy cast link</button>}</section></>}
 {(view==='board'||view==='mine')&&<><h1>{view==='mine'?'My casts':'Leaderboards'}</h1>{view==='board'&&<><label>Challenge or book<select value={boardId} onChange={e=>openBoard(e.target.value,category)}>
 <optgroup label="Featured challenges">{initialData.challenges.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</optgroup>
 <optgroup label="Books">{boardBooks.map(t=><option key={t.slug} value={'free:'+t.slug}>{t.title}{t.author?' — '+t.author:''}</option>)}</optgroup>
 </select></label><h2>{boardTitle}</h2><div className="actions"><button aria-pressed={category==='best'} className={category==='best'?'primary':''} onClick={()=>openBoard(boardId,'best')}>Best Cast</button><button aria-pressed={category==='hear'} className={category==='hear'?'primary':''} onClick={()=>openBoard(boardId,'hear')}>Hear Me Out</button></div><p>{category==='best'?'Which ensemble would you most want to watch?':'Which unexpected cast has won you over?'}</p><p className="muted">Each account can upvote or downvote a cast once per category. Select your vote again to remove it. {AI_NAME} (the AI) sets the starting score. From 21 votes on this board, member approval and {AI_NAME} each count for 50%. Ties go to the earlier cast.</p></>}{listState==='loading'&&<p role="status">Loading casts…</p>}{listState==='failed'&&<button onClick={()=>{setNotice('');setBoardRevision(n=>n+1)}}>Retry loading casts</button>}{listState==='ready'&&!records.length&&<div className="empty"><h2>{view==='mine'?'No saved casts yet.':'No casts submitted yet.'}</h2><p>Build a cast and {view==='mine'?'save it here.':'be the first to submit it.'}</p><button onClick={()=>view==='board'?castBoardTitle():start(challengeId)}>Start casting</button></div>}<div className="entries">{records.map((c,i)=><article key={c.id}><p className="eyebrow">{view==='board' && c.rating?.score!=null?`#${i+1} · `:''}{c.username} · {c.published?'PUBLIC':'PRIVATE'}</p><h2>{c.snapshot.challenge.title}</h2><div className="cast-summary">{c.snapshot.challenge.roles.map((r,j)=><CastCredit key={r.id} role={r} actor={c.snapshot.actors[j]}/>)}</div>{c.snapshot.pitch&&<blockquote>{c.snapshot.pitch}</blockquote>}<div className="actions"><button onClick={()=>openCast(c)}>Open cast</button></div>{view==='board'&&c.rating?<BoardBallot rating={c.rating} disabled={busy||c.ownerId===user?.id} onVote={direction=>vote(c,direction)}/>:<small>Best Cast upvotes · {c.best} · Hear Me Out upvotes · {c.hear}</small>}</article>)}</div></>}
 </main><footer>{publicMode?'WilderLeague beta. New beta accounts are separate from earlier WilderLeague accounts; existing data is preserved. Accounts, casts and AI results are stored online. No password recovery yet.':'Local tester preview. Accounts and casts stay on this computer. No password recovery yet.'} Living-actor eligibility uses a Wikidata snapshot checked October 26, 2026; missing or uncertain records are excluded. <a href="/beta-info">Privacy & feedback</a></footer>
 {inspectedActor&&<ActorAnalysisDialog key={inspectedActor.id} actor={inspectedActor} onDismiss={()=>setInspectedActor(null)}/>}
 {auth&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="modal"><button className="close" aria-label="Close account dialog" onClick={()=>{setResumeSearch(null);setAuth(false)}}>×</button><h2 id="auth-title">{register?'Create an account':'Sign in'}</h2><p>{resumeSearch?'Your actor search will run as soon as you sign in.':'Use it to save casts and vote. Your current choices will stay here.'}</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{const d=await api(register?'register':'login',{username:f.get('username'),password:f.get('password')});setUser(d.user);setAuth(false);setResumeSearch(null);if(resumeSearch===challengeId+':'+search){setNotice('');await searchAI()}else setNotice('Signed in. You can now save, submit or vote.')})}}><label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoFocus/></label><label>Password<input name="password" type="password" autoComplete={register?'new-password':'current-password'} required minLength={register?MIN_PASSWORD_LENGTH:1} maxLength={MAX_PASSWORD_LENGTH} aria-describedby={register?'signup-password-help':undefined}/></label><p className="muted" id="signup-password-help">{register?`At least ${MIN_PASSWORD_LENGTH} characters. Save your password. Account recovery is unavailable.`:'Use your account for this new casting experience.'}</p>{notice&&<p role="alert">{notice}</p>}<button className="primary" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button></form><button className="plain" onClick={()=>{setRegister(!register);setNotice('')}}>{register?'Already have an account? Sign in':'Create an account'}</button></section></div>}
 </div>
}
