import {clientAddress} from './client-address'
import {createHash} from 'node:crypto'
import {imageSize} from 'image-size'
import {StoreError,TesterStore} from './store'
import type {HostedStore} from './hosted-store'
import type {Challenge} from './model'

const maxImage = 4*1024*1024
const maxRequest = maxImage+16000
const actions:Record<string,string> = {
  add:'Add a missing character', remove:'Remove a character', correct:'Correct a character', art:'Fan artwork',
}

async function boundedForm(req:Request) {
  if (!req.headers.get('content-type')?.startsWith('multipart/form-data;') || !req.body)
    throw new StoreError('Use the submission form.',415)
  if (Number(req.headers.get('content-length'))>maxRequest) throw new StoreError('Maximum image size is 4 MB.',413)
  const reader=req.body.getReader(),chunks:Buffer[]=[]
  let bytes=0
  for (;;) {
    const {value,done}=await reader.read()
    if (done) break
    bytes+=value.byteLength
    if (bytes>maxRequest) {await reader.cancel();throw new StoreError('Maximum image size is 4 MB.',413)}
    chunks.push(Buffer.from(value))
  }
  try {return await new Response(Buffer.concat(chunks),{headers:{'Content-Type':req.headers.get('content-type')!}}).formData()}
  catch {throw new StoreError('The upload could not be read. Choose your file again.')}
}

export async function receiveContribution(req:Request,store:HostedStore|TesterStore,resolve:(slug:string)=>Promise<Challenge>,deliver=fetch) {
  const url=new URL(req.url)
  if (req.headers.get('origin')!==url.protocol+'//'+(req.headers.get('host')||url.host)) throw new StoreError('Reload this page and try again.',403)
  const visitor=store instanceof TesterStore?'local-preview':clientAddress(req)
  await store.limit('fan-contribution:'+visitor,12,3600000)
  const form=await boundedForm(req)
  function field(key:string,max:number,required=false) {
    const v=form.get(key)??''
    if(typeof v!=='string'||v.length>max||required&&!v.trim())throw new StoreError('Check the '+key+' field.')
    return v.trim()
  }
  const kind=field('kind',12,true),slug=field('slug',150,true),character=field('character',120,true)
  if (!Object.hasOwn(actions,kind)) throw new StoreError('Choose a contribution type.')
  const title=await resolve(slug)
  if ((kind==='remove'||kind==='correct')&&!title.roles.some(r=>r.name===character))throw new StoreError('Choose a character from the roster.')
  const message=field('message',2000,kind!=='art'),credit=field('credit',100,kind==='art'),email=field('email',254,kind==='art')
  let attachment:Buffer|undefined,filename=''
  const file=form.get('file')
  if (kind==='art') {
    if (field('consent',3)!=='yes'||!/^\S+@\S+\.\S+$/.test(email))throw new StoreError('Provide an email address and confirm permission to display the art.')
    if (!file || typeof file==='string' || !file.size || file.size>maxImage)throw new StoreError('Attach a PNG, JPEG or WebP up to 4 MB.')
    const bytes=Buffer.from(await file.arrayBuffer())
    let format:string|undefined
    try {
      const meta=imageSize(bytes)
      format=meta.type==='jpg'?'jpeg':meta.type
      if (!meta.width || !meta.height || meta.width*meta.height>48_000_000)throw new Error()
    } catch {throw new StoreError('Choose a readable image of up to 48 megapixels.')}
    if (!['png','jpeg','webp'].includes(format||''))throw new StoreError('Choose a PNG, JPEG or WebP image.')
    attachment=bytes; filename='fan-art.'+format
  } else if (file) throw new StoreError('Only artwork submissions accept a file.')
  const detail={kind,slug,title:title.title,character,message,credit,email,consent:kind==='art',filename}
  const id=createHash('sha256').update(JSON.stringify(detail)).update(attachment??'').digest('hex')
  if (store instanceof TesterStore) {
    store.db.exec('CREATE TABLE IF NOT EXISTS fan_contributions (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, details TEXT NOT NULL, artwork BLOB)')
    store.db.prepare('INSERT OR IGNORE INTO fan_contributions VALUES(?,?,?,?)').run(id,new Date().toISOString(),JSON.stringify(detail),attachment??null)
  } else {
    const to=kind==='art'?process.env.ART_SUBMISSION_EMAIL:process.env.CORRECTION_EMAIL
    if (!to||!process.env.RESEND_API_KEY)throw new StoreError('The review inbox is unavailable. Please try again later.',503)
    const sent=await deliver('https://api.resend.com/emails',{method:'POST',headers:{
      'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'wl-fan-'+id,
    },body:JSON.stringify({from:process.env.WILDERLEAGUE_MAIL_FROM||'Wilder League <onboarding@resend.dev>',to,
      subject:'WilderLeague · '+actions[kind]+' · '+title.title,
      text:[actions[kind],title.title,'Character: '+character,message,credit&&'Artist credit: '+credit,email&&'Reply: '+email,kind==='art'&&'Artist granted permission to display with credit.'].filter(Boolean).join('\n\n'),
      ...(email?{reply_to:email}:{}),...(attachment?{attachments:[{filename,content:attachment.toString('base64')}]}:{})}),
      signal:AbortSignal.timeout(12000)})
    if (!sent.ok)throw new StoreError('The review inbox could not accept your submission. Please try again.',503)
  }
  return {ok:true}
}
