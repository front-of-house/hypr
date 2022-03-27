import merge from 'deepmerge'
import status from 'statuses'
import { Response as LambdaResponse } from 'lambda-types'

import type { AnyKeyValue, HyprEvent, HyprContext, HyprResponse, HyprMiddleware, HyprHandler } from './lib/types'

import * as methods from './methods'
import * as httpHeaders from './headers'
import * as mimes from './mimes'
import { createMiddleware } from './lib/createMiddleware'
import { normalizeEvent } from './lib/normalizeEvent'
import { normalizeResponse } from './lib/normalizeResponse'
import * as cookies from './cookies'

const Blobbber = (() => {
  if (typeof Blob !== 'undefined') {
    return Blob
  } else {
    return require('buffer').Blob
  }
})() as typeof Blob

export class HttpError extends Error {
  statusCode: HyprResponse['statusCode']
  // @ts-ignore
  message: string | AnyKeyValue
  headers?: HyprResponse['headers']
  expose: boolean

  constructor(
    statusCode = 500,
    message?: string | AnyKeyValue,
    options: {
      expose?: boolean
      headers?: HyprResponse['headers']
    } = {}
  ) {
    super()
    this.name = status.message[statusCode] || 'Error'
    this.statusCode = statusCode
    this.message = message || ''
    this.expose = options.expose !== undefined ? options.expose : statusCode < 500

    if (options.headers) this.headers = options.headers
  }
}

export const errorHandler = createMiddleware((event, context, response) => {
  let statusCode = 500
  let message
  let headers = {}
  let expose = false

  if (context.error instanceof HttpError) {
    statusCode = context.error.statusCode
    message = context.error.message || message
    headers = context.error.headers || headers
    expose = context.error.expose
  } else if (context.error instanceof Error) {
    message = context.error.message
  }

  if (!expose || !message) {
    message = status.message[statusCode]
  }

  const res: Partial<HyprResponse> = {
    statusCode,
    headers,
  }

  const accept = event.headers[httpHeaders.Accept] || ''

  if (accept.includes('json')) {
    res.json =
      typeof message === 'object'
        ? message
        : {
            detail: message,
          }
  } else if (accept.includes('html')) {
    res.html = `<h1>${message}</h1>`
  } else {
    res.body = String(message)
  }

  Object.assign(response, merge(response, res))
})

/**
 * Final handler
 */
export function serializeBody(response: HyprResponse): LambdaResponse {
  const { html = undefined, json = undefined, xml = undefined } = response

  const content = response.body || html || json || xml || undefined
  const body = typeof content === 'object' ? JSON.stringify(content) : content || ''
  const headers: HyprResponse['headers'] = {}
  let contentType = response.headers ? response.headers[httpHeaders.ContentType] : undefined

  if (!contentType) {
    if (!!html) contentType = mimes.html
    else if (!!json) contentType = mimes.json
    else if (!!xml) contentType = mimes.xml
    else contentType = mimes.text
  }

  if (body) {
    headers[httpHeaders.ContentType] = contentType
    headers[httpHeaders.ContentLength] = String(new Blobbber([body]).size)
  }

  // TODO expecting statusCode??
  // @ts-ignore
  return merge(response, { headers, body })
}

async function processHandlers<E = AnyKeyValue, C = AnyKeyValue>(
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

/**
 * Main exports
 */

export { HyprEvent, HyprContext, HyprResponse } from './lib/types'
export * as headers from './headers'
export * as methods from './methods'
export * as mimes from './mimes'
export { createMiddleware } from './lib/createMiddleware'

export function redirect(
  code: 301 | 302 | 307 | 308,
  location: string | HyprResponse['headers']
): Partial<HyprResponse> {
  const headers =
    typeof location === 'object'
      ? location
      : {
          location,
        }

  return {
    statusCode: code,
    headers,
  }
}

export function stack<E = AnyKeyValue, C = AnyKeyValue>(
  handlers: HyprMiddleware<E, C>[],
  errorHandlers: HyprMiddleware<E, C>[] = []
) {
  return async function main(event: HyprEvent<E>, context: HyprContext<C>): Promise<LambdaResponse> {
    const ev = normalizeEvent<E>(event)

    try {
      return await processHandlers<E, C>(ev, context, [cookies.thaw(), ...handlers, cookies.bake()])
    } catch (e) {
      try {
        context.error = e instanceof Error ? e : new Error(String(e))
        return await processHandlers<E, C>(
          ev,
          context,
          errorHandlers.length ? [errorHandler, ...errorHandlers] : [errorHandler]
        )
      } catch (e) {
        context.error = e instanceof Error ? e : new Error(String(e))
        return await processHandlers<E, C>(ev, context, [errorHandler])
      }
    }
  }
}

export function main<E = AnyKeyValue, C = AnyKeyValue>(
  handlers: HyprHandler<E, C> | Partial<Record<methods.Methods, HyprHandler<E, C>>>
): HyprMiddleware<E, C> {
  const methods: Partial<Record<methods.Methods, HyprHandler<E, C>>> =
    typeof handlers === 'function'
      ? {
          get: handlers,
        }
      : handlers

  if ((methods.get || methods.post) && !methods.options) {
    // allow header is set below
    methods.options = () => ({ statusCode: 204 })
  }

  if (methods.get && !methods.head) {
    methods.head = async (e, c) => {
      // @ts-ignore already checked
      const res = await methods.get(e, c)
      delete res.body
      return res
    }
  }

  const handler = createMiddleware<E, C>(async (event, context, response) => {
    const method = methods[event.httpMethod.toLowerCase() as methods.Methods]
    const allow = Object.keys(methods)
      .map((s) => s.toUpperCase())
      .join(', ')

    if (method) {
      const res = await method(event, context)
      Object.assign(response, merge.all([response, res, { headers: { [httpHeaders.Allow]: allow } }]))
    } else {
      throw new HttpError(405, `Method ${event.httpMethod} not allowed`, {
        headers: { [httpHeaders.Allow]: allow },
      })
    }
  })

  handler.__main__ = true

  return handler
}
