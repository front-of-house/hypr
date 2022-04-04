import merge from 'deepmerge'

import type { AnyKeyValue, HyprEvent, HyprContext, HyprMiddleware } from './types'

import { normalizeResponse } from './normalizeResponse'
import { serializeBody } from './serializeBody'

export async function processHandlers<E = AnyKeyValue, C = AnyKeyValue>(
  event: HyprEvent<E>,
  context: HyprContext<C>,
  handlers: HyprMiddleware<E, C>[]
) {
  let response = normalizeResponse({})
  let hasEarlyResponse = false

  for (const handler of handlers) {
    if (hasEarlyResponse && handler.__main__) continue

    const early = await handler(event, context, response)

    if (early) {
      Object.assign(response, merge(response, early))
      hasEarlyResponse = true
    }

    response = normalizeResponse(response)
  }

  return serializeBody(response)
}
