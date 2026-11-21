import {getCloudflareContext} from '@opennextjs/cloudflare'

declare global {
  interface CloudflareEnv {
    WL_MEDIA: {renderCastPng(svg:string):Promise<Uint8Array>}
  }
}

export function workerBindings() {
  return getCloudflareContext().env
}
