import {HostedStore} from '../../../lib/tester/hosted-store'
import {StoreError} from '../../../lib/tester/store'
import { NextRequest } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  if(process.env.WILDERLEAGUE_PUBLIC==='1'){
    if(req.headers.get('origin')!==`${req.nextUrl.protocol}//${req.headers.get('host')||req.nextUrl.host}`)return Response.json({error:'Reload this page and try again.'},{status:403})
    try{const store=new HostedStore();await store.limit('contact:'+ (req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown'),3,3600000);await store.limit('contact-global',30,86400000)}catch(e){return Response.json({error:e instanceof StoreError?e.message:'Contact is temporarily unavailable.'},{status:429})}
  }
  const raw=await req.text();if(raw.length>12000)return Response.json({error:'Message is too long.'},{status:413})
  let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'Invalid message.'},{status:400})}
  const { name, email, subject='', message } = body||{}
  if(typeof name!=='string'||name.length>120||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof subject!=='string'||subject.length>200||typeof message!=='string'||message.length>8000)return Response.json({error:'Check your name, email and message.'},{status:400})
  const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const toEmail = process.env.CORRECTION_EMAIL

  if (!resendKey || !toEmail) {
    console.error('RESEND_API_KEY or CORRECTION_EMAIL not set')
    return Response.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const result=await resend.emails.send({
    from: 'Wilder League <onboarding@resend.dev>',
    to: toEmail,
    replyTo: email,
    subject: `Contact: ${subject?.trim() || '(no subject)'} — from ${name}`,
    html: `
      <h2>New contact message</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:8px;color:#666;width:100px">Name</td><td style="padding:8px">${escape(name)}</td></tr>
        <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px">${escape(email)}</td></tr>
        ${subject?.trim() ? `<tr><td style="padding:8px;color:#666">Subject</td><td style="padding:8px">${escape(subject)}</td></tr>` : ''}
        <tr><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px;white-space:pre-wrap">${escape(message)}</td></tr>
      </table>
    `,
  })

  if(result.error)return Response.json({error:'Your message could not be sent. Please try again later.'},{status:503})
  return Response.json({ ok: true })
}
