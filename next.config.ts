import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  distDir:process.env.WL_BUILD_CHECK==='1'?'.next-check':'.next',
  images:{unoptimized:process.env.WL_CLOUDFLARE==='1',remotePatterns:[{protocol:'https',hostname:'image.tmdb.org',pathname:'/t/p/**',search:''}]},
}
// Secrets remain server environment variables; do not expose them through nextConfig.env.
export default nextConfig
