import * as headers from './headers'
import * as methods from './methods'
import { createMiddleware } from './lib/createMiddleware'

function join(value: string | string[]) {
  return ([] as string[]).concat(value)
}

function serialize(value: string | string[]) {
  return join(value).join(', ')
}

function getOrigin(header: string, available?: string[]) {
  if (!available) return header
  if (available[0] === '*') return header
  if (available.includes(header)) return header
  return available[0]
}

export function cors({
  allowCredentials,
  allowHeaders,
  allowMethods,
  allowOrigin,
  exposeHeaders,
  requestHeaders,
  requestMethods,
  maxAge,
  cacheControl,
}: {
  allowCredentials?: boolean
  allowHeaders?: string | string[]
  allowMethods?: string | string[]
  allowOrigin?: string | string[]
  exposeHeaders?: string | string[]
  requestHeaders?: string | string[]
  requestMethods?: string | string[]
  maxAge?: number
  cacheControl?: string
} = {}) {
  return createMiddleware((ev, ctx, res) => {
    const incomingOrigin = ev.headers?.origin

    if (allowCredentials) res.headers[headers.AccessControlAllowCredentials] = 'true'
    if (allowHeaders) res.headers[headers.AccessControlAllowHeaders] = serialize(allowHeaders)
    if (allowMethods) res.headers[headers.AccessControlAllowMethods] = serialize(allowMethods)

    if (allowOrigin && incomingOrigin)
      res.headers[headers.AccessControlAllowOrigin] = getOrigin(incomingOrigin, join(allowOrigin))

    if (res.headers[headers.AccessControlAllowOrigin] !== '*') res.headers[headers.Vary] = 'Origin'

    if (exposeHeaders) res.headers[headers.AccessControlExposeHeaders] = serialize(exposeHeaders)
    if (requestHeaders) res.headers[headers.AccessControlRequestHeaders] = serialize(requestHeaders)
    if (requestMethods) res.headers[headers.AccessControlRequestMethods] = serialize(requestMethods)
    if (maxAge) res.headers[headers.AccessControlMaxAge] = String(maxAge)

    if (ev.httpMethod === methods.OPTIONS) {
      if (cacheControl && !res.headers[headers.CacheControl]) res.headers[headers.CacheControl] = cacheControl
    }
  })
}
