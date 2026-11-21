export function clientAddress(request: Request) {
  // Only trust the client header overwritten by the current hosting provider.
  const header = process.env.WL_CLOUDFLARE === '1' ? 'cf-connecting-ip' : 'x-vercel-forwarded-for'
  return request.headers.get(header)?.split(',')[0]?.trim() || 'unknown'
}
