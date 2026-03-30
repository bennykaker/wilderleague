'use client'

import { useEffect } from 'react'

// Replace with your actual AdSense publisher ID and slot IDs once approved
// Publisher ID format: ca-pub-XXXXXXXXXXXXXXXX
// Slot ID format: XXXXXXXXXX

type AdSlot = 'results' | 'casting-footer'

const SLOT_IDS: Record<AdSlot, string> = {
  'results':         '1234567890', // replace after AdSense approval
  'casting-footer':  '0987654321', // replace after AdSense approval
}

const PUBLISHER_ID = 'ca-pub-9605271238285023'

export default function AdBanner({ slot }: { slot: AdSlot }) {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adsbygoogle = (window as any).adsbygoogle
      if (adsbygoogle) {
        adsbygoogle.push({})
      }
    } catch { /* already pushed */ }
  }, [])

  return (
    <div style={{
      width: '100%',
      textAlign: 'center',
      padding: '8px 0',
      opacity: 0.85,
    }}>
      <div style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
        Advertisement
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOT_IDS[slot]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
