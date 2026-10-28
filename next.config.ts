import type { NextConfig } from 'next'
const nextConfig: NextConfig = {distDir:process.env.WL_BUILD_CHECK==='1'?'.next-check':'.next'}
// Secrets remain server environment variables; do not expose them through nextConfig.env.
export default nextConfig
