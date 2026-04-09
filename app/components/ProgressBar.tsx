'use client'

import { Suspense } from 'react'
import { AppProgressBar } from 'next-nprogress-bar'

function Bar() {
  return (
    <AppProgressBar
      height="3px"
      color="#3b82f6"
      options={{ showSpinner: false }}
      shallowRouting
    />
  )
}

export default function ProgressBar() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  )
}
