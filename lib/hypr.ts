import merge from 'deep-extend'
import status from 'statuses'
import { Event as LambdaEvent, Context as LambdaContext, Response as LambdaResponse } from 'lambda-types'

export { LambdaResponse }
export type Dictionary = Record<string, any>
export type Unsync<T> = T | Promise<T>
export type Event<T = Dictionary> = LambdaEvent & { json?: Dictionary } & Dictionary & T
export type ContextError = { error: HttpError | Error }
export type Context<T = Dictionary> = LambdaContext & Dictionary & T
export type BodyShorthands = {
  html?: string
  json?: object
  xml?: string
}
export type Response = LambdaResponse & BodyShorthands & Dictionary
export type Handler<E = Dictionary, C = Dictionary> = (
  event: Event<E>,
  context: Context<C>,
  response?: Partial<Response>
) => Unsync<Partial<Response> | void>
export type ErrorHandler = Handler<Dictionary, ContextError>
export type HttpMethods = 'get' | 'post' | 'patch' | 'put' | 'options'

export class HttpError extends Error {
  statusCode: Response['statusCode']
  // @ts-ignore
  message: string | Dictionary
  headers?: Response['headers']
  expose: boolean

  constructor(
    statusCode = 500,
    message?: string | Dictionary,
    options: {
      expose?: boolean
      headers?: Response['headers']
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

export function createHandler<T = Dictionary>(init: (options?: T) => Handler) {
  return init
}

export function normalizeResponse(response: Partial<Response>): LambdaResponse {
  const {
    isBase64Encoded = false,
    statusCode = 200,
    headers = {},
    multiValueHeaders = {},
    body,
    html = undefined,
    json = undefined,
    xml = undefined,
  } = response
  const responseBody = body || html || json || xml || undefined
  let contentType = 'text/plain; charset=utf-8'

  if (!!html) {
    contentType = 'text/html; charset=utf-8'
  } else if (!!json) {
    contentType = 'application/json; charset=utf-8'
  } else if (!!xml) {
    contentType = 'application/xml; charset=utf-8'
  }

  return {
    isBase64Encoded,
    statusCode,
    headers: {
      'Content-Type': contentType,
      ...headers,
    },
    multiValueHeaders,
    body: typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody || '',
  }
}

export function errorHandler(event: Event, context: Context) {
  let statusCode = 500
  let message
  let headers
  let expose = statusCode < 500

  if (context.error instanceof HttpError) {
    statusCode = context.error.statusCode
    message = context.error.message || message
    headers = context.error.headers || headers
    expose = context.error.expose
  } else if (context.error instanceof Error) {
    message = context.error.message
  }

  const httpMessage = status.message[statusCode]
  const response: Partial<Response> = {
    statusCode,
  }

  if (headers) response.headers = headers

  if (!expose || !message) {
    response.json = {
      detail: httpMessage,
    }
  } else {
    response.json =
      typeof message === 'object'
        ? message
        : {
            detail: message,
          }
  }

  return response
}

export function enhanceEvent(event: Event): Event {
  const type = event.headers['Content-Type'] || event.headers['content-type'] || ''

  if (event.body && type.includes('json')) {
    try {
      event.json = JSON.parse(event.body)
    } catch (e) {}
  }

  return event
}

async function run(event: Event, context: Context, handlers: Handler<any, any>[]) {
  let response = {}

  for (const handler of handlers) {
    response = merge(response, (await handler(event, context, response)) || {})
  }

  if (!response || !Object.keys(response).length) {
    throw new HttpError(500, `No response from server`)
  }

  return normalizeResponse(response)
}

export function stack(handlers: Handler[], errorHandlers: ErrorHandler[] = []) {
  return async function main(event: Event, context: Context): Promise<LambdaResponse> {
    const ev = enhanceEvent(event)

    try {
      return await run(ev, context, handlers)
    } catch (e) {
      try {
        context.error = e instanceof Error ? e : new Error(String(e))
        return await run(ev, context, errorHandlers.length ? errorHandlers : [errorHandler])
      } catch (e) {
        context.error = e instanceof Error ? e : new Error(String(e))
        return normalizeResponse(errorHandler(ev, context))
      }
    }
  }
}

export function main(handlers: Handler | { [key in HttpMethods]?: Handler }) {
  const methods =
    typeof handlers === 'function'
      ? {
          get: handlers,
        }
      : handlers

  return function mainHandler(event: Event, context: Context, response: Partial<Response>) {
    const method = methods[event.httpMethod.toLowerCase() as HttpMethods]
    if (method) return method(event, context, response)
    else throw new HttpError(405)
  }
}
