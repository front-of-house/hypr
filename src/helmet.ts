import merge from 'deepmerge'

import type { HyprEvent, HyprContext, HyprResponse } from './lib/types'
import * as headers from './headers'

export function helmet() {
  return (ev: HyprEvent, ctx: HyprContext, res: HyprResponse) => {
    Object.assign(
      res,
      merge(res, {
        headers: {
          [headers.XDnsPrefetchControl]: 'off',
          [headers.XFrameOptions]: 'sameorigin',
          [headers.XDownloadOptions]: 'noopen',
          [headers.XContentTypeOptions]: 'nosniff',
          [headers.XXssProtection]: '1; mode=block',
          [headers.StrictTransportSecurity]: 'max-age=5184000',
        },
      })
    )
  }
}
