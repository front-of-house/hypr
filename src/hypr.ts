import merge from 'deepmerge'
import status from 'statuses'
import { Response as LambdaResponse } from 'lambda-types'

import type { AnyKeyValue, HyprEvent, HyprContext, HyprResponse, HyprMiddleware, HyprHandler } from './lib/types'

import * as methods from './methods'
import * as httpHeaders from './headers'
import { createMiddleware } from './lib/createMiddleware'
import { normalizeEvent } from './lib/normalizeEvent'
import { processHandlers } from './lib/processHandlers'
import { handleError } from './lib/handleError'
import * as cookies from './cookies'

export { HyprEvent, HyprContext, HyprResponse } from './lib/types'
export * as headers from './headers'
export * as methods from './methods'
export * as mimes from './mimes'
export { createMiddleware } from './lib/createMiddleware'

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
          errorHandlers.length ? [handleError, ...errorHandlers, cookies.bake()] : [handleError, cookies.bake()]
        )
      } catch (e) {
        context.error = e instanceof Error ? e : new Error(String(e))
        return await processHandlers<E, C>(ev, context, [handleError])
      }
    }
  }
}

export function main<E = AnyKeyValue, C = AnyKeyValue>(
  handlers: HyprHandler<E, C> | Partial<Record<methods.Methods, HyprHandler<E, C>>>
): HyprMiddleware<E, C> {
  const methods: Partial<Record<methods.Methods, HyprHandler<E, C>>> =
    // TODO function should just allow any method
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
