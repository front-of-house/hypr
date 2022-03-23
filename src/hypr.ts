import merge from 'deepmerge'
import status from 'statuses'
import { Response as LambdaResponse } from 'lambda-types'

import type { AnyKeyValue, HyprEvent, HyprContext, HyprResponse, HyprMiddleware, HyprHandler } from './lib/types'

import * as methods from './lib/methods'
import * as httpHeaders from './lib/headers'
import * as mimes from './lib/mimes'
import { createMiddleware } from './lib/createMiddleware'
import { normalizeEvent } from './lib/normalizeEvent'
import { normalizeResponse } from './lib/normalizeResponse'

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
  let contentType = response.headers ? response.headers[httpHeaders.ContentType] : undefined

  if (!contentType) {
    if (!!html) contentType = mimes.html
    else if (!!json) contentType = mimes.json
    else if (!!xml) contentType = mimes.xml
    else contentType = mimes.text
  }

  return merge(response, {
    headers: {
      [httpHeaders.ContentType]: contentType,
      [httpHeaders.ContentLength]: new Blobbber([body]).size,
    },
    body,
  })
}

async function processHandlers<E = AnyKeyValue, C = AnyKeyValue>(
  event: HyprEvent<E>,
  context: HyprContext<C>,
  handlers: HyprMiddleware<E, C>[]
) {
  let response = normalizeResponse({})

  for (const handler of handlers) {
    const early = await handler(event, context, response)

    if (early) {
      response = normalizeResponse(merge(response, early))
      break
    }

    response = normalizeResponse(response)
  }

  return serializeBody(response)
}

/**
 * Main exports
 */

export { HyprEvent, HyprContext, HyprResponse } from './lib/types'
export * as headers from './lib/headers'
export * as methods from './lib/methods'
export * as mimes from './lib/mimes'
export { createMiddleware } from './lib/createMiddleware'

export function redirect(code: 301 | 302 | 307 | 308, location: string): Partial<HyprResponse> {
  return {
    statusCode: code,
    headers: { location },
  }
}

export function stack<E = AnyKeyValue, C = AnyKeyValue>(
  handlers: HyprMiddleware<E, C>[],
  errorHandlers: HyprMiddleware<E, C>[] = []
) {
  return async function main(event: HyprEvent<E>, context: HyprContext<C>): Promise<LambdaResponse> {
    const ev = normalizeEvent<E>(event)

    try {
      return await processHandlers<E, C>(ev, context, handlers)
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
) {
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

  return createMiddleware<E, C>(async (event, context, response) => {
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
}
