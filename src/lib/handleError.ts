import merge from 'deepmerge'
import status from 'statuses'

import type { HyprResponse } from './types'

import * as httpHeaders from '../headers'
import { createMiddleware } from './createMiddleware'
import { HttpError } from '../hypr'

export const handleError = createMiddleware((event, context, response) => {
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
