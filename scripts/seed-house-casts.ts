// Run with tsx. Dry-run by default. --apply publishes real, voteable house entries.
import {createHash,randomBytes} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {houseCastId} from '../lib/tester/house-cast-id'
import {houseId,programmeRoster,tvStunts,weeklyReboot} from '../lib/tester/board-programme'
import {literaryChallenge} from '../lib/tester/books'
import {hasLeaderboard} from '../lib/tester/leaderboard'
import {validateCast,type Catalogue,type Challenge,type LibraryTitle,type TesterActor,type TesterRole} from '../lib/tester/model'

const origin='https://www.wilderleague.com'
const styles=[
  {name:'The quiet take',tags:['understated','quiet','restraint','subtle'],direction:'let the silences do some of the talking'},
  {name:'The live wire',tags:['intense','fiery','witty','explosive'],direction:'let the argument start before either of them knows what it is about'},
  {name:'The slow burn',tags:['brooding','dramatic','uneasy','menace'],direction:'hold something back until the last scene'},
  {name:'The screwball take',tags:['comedy','wit','comic','charm'],direction:'see who can get the other to break first'},
  {name:'The unlikely allies',tags:['warmth','empathy','weary','gravitas'],direction:'find the moment when two strangers start to trust each other'},
]
const featured:Record<string,{actors:string[];pitch:string}[]>={
  'weekly:2026-11-16':[
    {actors:['Jake Johnson','Jodie Comer','Natasha Lyonne','Richard Kind','David Harbour','Stephen Root'],pitch:'Diane walks into her usual bar with a manuscript. Everybody on the stools wants to know which names she changed first.'},
  ],
  'mad-men-chuck-lorre':[
    {actors:['Ashton Kutcher','Melanie Lynskey','Simon Helberg','Kaley Cuoco','Jaime Pressly','Allison Janney'],pitch:'Janney’s Roger takes the clients to lunch. By the time they get back, Lynskey’s Peggy has rewritten the entire campaign.'},
  ],
  'free:book-sarah-j-maas-a-court-of-thorns-and-roses':[
    {actors:['Margaret Qualley','Theo James','Domhnall Gleeson','Dev Patel','Eva Green'],pitch:'Give Theo James the Spring Court. Patel can make Rhysand’s bargain sound like a favour until Feyre hears the price.'},
    {actors:['Florence Pugh','Alexander Skarsgård','Andrew Scott','Nicholas Hoult','Rachel Weisz'],pitch:'Pugh’s Feyre would count the exits before admiring the palace. Let Weisz catch her doing it.'},
  ],
  'free:book-terry-pratchett-guards-guards':[
    {actors:['Ryan Gosling','Will Poulter','Gwendoline Christie','Nick Frost','Richard Ayoade','Mark Strong'],pitch:'Gosling’s Vimes has worn through both soles. Poulter’s Carrot still polishes his boots every night.'},
    {actors:['Peter Capaldi','Nicholas Hoult','Hannah Waddingham','Timothy Spall','Steve Buscemi','Tilda Swinton'],pitch:'Capaldi and Waddingham give Vimes and Sybil two entirely different ideas of what constitutes a manageable dragon.'},
  ],
}
const beats:[RegExp,string[]][]=[
  [/detective|inspector|investigat|cop\b|sheriff/i,['crime','thriller','weary']],
  [/king\b|queen\b|ruler|commander|captain|mentor|senator|president/i,['gravitas','commanding','authority']],
  [/comic|clown|sarcas|wry|joke|mischief/i,['wit','comedy','witty']],
  [/lover|romanc|suitor|charm|courtship/i,['romantic','charm','warmth']],
  [/villain|enemy|nemesis|antagonist|tyrant/i,['menace','sinister','intensity']],
  [/warrior|fighter|soldier|pilot|knight/i,['action','intense','commanding']],
]
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
async function read<T>(action:string):Promise<T>{
  const r=await fetch(origin+'/api/preview/'+action,{signal:AbortSignal.timeout(90000)})
  if(!r.ok)throw Error('Could not read '+action+' ('+r.status+')')
  return r.json()
}
async function main(){
  const [directory,rosters,index]=await Promise.all([read<Catalogue>('actor-directory'),read<{challenges:Challenge[]}>('challenge-rosters'),read<{titles:LibraryTitle[]}>('titles')])
  const actors=new Map(directory.actors.map(a=>[a.id,a])),byName=new Map(directory.actors.map(a=>[a.name,a]))
  const popularity=new Map(directory.actors.map((a,i)=>[a.id,1/(1+i/160)]))
  const all=directory.actors.map(a=>a.id)
  const week=weeklyReboot()
  const boards=[
    ...tvStunts.map(t=>programmeRoster(t.id)!),
    ...rosters.challenges.filter(hasLeaderboard),
    programmeRoster(week.id)!,
  ]
  for(const title of index.titles.filter(t=>t.type==='book')){
    const roster=literaryChallenge(title.slug)||(await read<{challenge:Challenge}>('title?slug='+encodeURIComponent(title.slug))).challenge
    if(!hasLeaderboard(roster))throw Error('Missing book board: '+title.title)
    boards.push(roster)
  }
  const year=new Date().getUTCFullYear()
  function fit(actor:TesterActor,role:TesterRole,tags:string[],original:TesterActor|undefined) {
    const age=actor.birthYear?year-actor.birthYear:40
    const bio=role.description
    const target=/\b(child|schoolboy|schoolgirl|little girl|little boy)\b/i.test(bio)?13:/\b(teenager|teenage|teen|high school|adolescent)\b/i.test(bio)?20:/\b(elderly|grandfather|grandmother|patriarch|matriarch)\b/i.test(bio)?65:null
    return (actor.descriptionTags||[]).filter(t=>tags.includes(t)).length*.4+(popularity.get(actor.id)||0)*2.4+
      (actor.image?0.7:0)+(original&&actor.gender===original.gender?0.65:0)-
      (target===null?0:Math.abs(age-target)*0.25)
  }
  const rows=[]
  for(const board of boards){
    if(!board.roles.length)throw Error('No roles for '+board.id)
    const ids=board.pool==='all'?all:directory.pools[board.poolSourceId||board.id]
    if(!ids?.length)throw Error('Missing eligible pool for '+board.id)
    const pool=ids.map(id=>actors.get(id)!).filter(Boolean),originals=new Set(board.roles.map(r=>r.originalActor?.toLowerCase()))
    const eligible=pool.filter(a=>!originals.has(a.name.toLowerCase())), previous=new Map<string,number>()
    const slates=new Set<string>(),count=board.id.startsWith('free:')?2:5
    for(let v=0;v<count;v++){
      const curated=featured[board.id]?.[v],offset=parseInt(hash(board.id).slice(0,4),16)%styles.length
      const style=styles[(v*2+offset)%styles.length]
      let state=parseInt(hash(board.id+'/'+v).slice(0,8),16)
      const next=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296}
      const chosen:TesterActor[]=[],used=new Set<string>()
      for(const [i,role] of board.roles.entries()){
        const tags=[...new Set([...style.tags,...beats.filter(([re])=>re.test(role.name+' '+role.description)).flatMap(([,t])=>t)])]
        const named=curated?.actors[i],original=byName.get(role.originalActor)
        let pick=named?byName.get(named):undefined
        if(named&&!pick)throw Error('Unknown featured actor: '+named)
        if(pick&&(!ids.includes(pick.id)||used.has(pick.id)||originals.has(pick.name.toLowerCase())))throw Error('Ineligible featured pick '+named+' for '+board.id)
        if(!pick){
          let best=-Infinity
          for(const actor of eligible){
            if(used.has(actor.id))continue
            const score=fit(actor,role,tags,original)+next()*5-(previous.get(actor.id)||0)*2.5
            if(score>best){pick=actor;best=score}
          }
        }
        if(!pick)throw Error('Too few eligible actors for '+board.id)
        chosen.push(pick);used.add(pick.id)
      }
      const picks=chosen.map(a=>a.id),line=picks.join('|')
      if(slates.has(line))throw Error('Duplicate lineup for '+board.id)
      slates.add(line)
      for(const pick of picks)previous.set(pick,(previous.get(pick)||0)+1)
      const pitch=curated?.pitch || style.name+'. Put '+chosen[0].name+' and '+chosen[1].name+' together and '+style.direction+'.'
      validateCast({challengeId:board.id,picks,pitch,publish:true},{actors:[],challenges:[board],pools:{[board.id]:ids}})
      rows.push({id:houseCastId(board.id,v),user_id:houseId,challenge_id:board.id,snapshot:{challenge:board,actors:chosen,pitch},fingerprint:'house-v1-'+(v+1),published:true})
    }
  }
  const stats={tvListings:tvStunts.length,books:index.titles.filter(t=>t.type==='book').length,boards:boards.length,casts:rows.length,weekly:week.id}
  console.log(stats)
  if(!process.argv.includes('--apply'))return
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key||new URL(url).hostname!=='ooqaylkombbinowzqmaj.supabase.co')throw Error('Set the Wilder League server database bindings.')
  const db=createClient(url,key,{auth:{persistSession:false}}),username='WilderLeague_Editorial'
  const owner=await db.from('wl_beta_users').upsert({id:houseId,username,username_key:username.toLowerCase(),salt:randomBytes(16).toString('hex'),password_hash:randomBytes(64).toString('hex')},{onConflict:'id',ignoreDuplicates:true})
  if(owner.error)throw Error('Editorial owner: '+owner.error.code)
  const confirmed=await db.from('wl_beta_users').select('username').eq('id',houseId).single()
  if(confirmed.data?.username!==username)throw Error('Unexpected editorial owner')
  for(let i=0;i<rows.length;i+=40){
    const batch=rows.slice(i,i+40)
    const result=await db.from('wl_beta_casts').upsert(batch,{onConflict:'id',ignoreDuplicates:true})
    if(result.error)throw Error('Batch '+i+': '+result.error.code)
  }
  const expected=new Set(rows.map(r=>r.id))
  for(let from=0;;from+=500){
    const {data,error}=await db.from('wl_beta_casts').select('id').eq('user_id',houseId).eq('published',true).order('id').range(from,from+499)
    if(error)throw Error('Unable to verify published casts')
    for(const row of data)expected.delete(row.id)
    if(data.length<500)break
  }
  if(expected.size)throw Error('Missing '+expected.size+' published casts')
  console.log('Verified all '+rows.length+' official entries.')
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
