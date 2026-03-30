import Stripe from 'stripe'
import fs from 'fs'
import path from 'path'

function getEnv(name: string): string {
  if (process.env[name]) return process.env[name]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${name}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

export const stripe = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2026-03-25.dahlia',
})

export const PRICE_ID = getEnv('STRIPE_PRICE_ID')
export const PRICE_ID_DIRECTOR = getEnv('STRIPE_PRICE_ID_DIRECTOR')
