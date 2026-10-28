import { NextRequest, NextResponse } from 'next/server'
export function proxy(request: NextRequest) {
  if ((process.env.WILDERLEAGUE_PREVIEW === '1' || process.env.WILDERLEAGUE_PUBLIC === '1') && request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/preview/') && !(process.env.WILDERLEAGUE_PUBLIC === '1' && ['/api/stripe/webhook','/api/contact'].includes(request.nextUrl.pathname))) {
    return NextResponse.json({error:'Live API actions are disabled in this preview.'},{status:403})
  }
  return NextResponse.next()
}
export const config = { matcher: '/api/:path*' }
