import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import status from 'statuses'

import type { HyprEvent, HyprContext } from '../types'

import * as httpHeaders from '../../headers'
import { normalizeResponse } from '../normalizeResponse'
import { handleError } from '../handleError'
import { HttpError } from '../../hypr'

const test = suite('serializeBody')

test(`handleError - Error`, async () => {
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new Error('foo'),
  } as HyprContext
  const response = normalizeResponse({})
  handleError(event, ctx, response)

  assert.equal(
    response,
    normalizeResponse({
      statusCode: 500,
      json: {
        detail: status.message[500],
      },
    })
  )
})

test(`handleError - HttpError`, async () => {
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400),
  } as HyprContext
  const response = normalizeResponse({})
  handleError(event, ctx, response)

  assert.equal(
    response,
    normalizeResponse({
      isBase64Encoded: false,
      statusCode: 400,
      json: {
        detail: status.message[400],
      },
    })
  )
})

test(`handleError - HttpError with message`, async () => {
  const message = 'whoops'
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400, message),
  } as HyprContext
  const response = normalizeResponse({})
  handleError(event, ctx, response)

  assert.equal(
    response,
    normalizeResponse({
      statusCode: 400,
      json: {
        detail: message,
      },
    })
  )
})

test(`handleError - HttpError with JSON message`, async () => {
  const message = { foo: true }
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400, message),
  } as HyprContext
  const response = normalizeResponse({})
  handleError(event, ctx, response)

  assert.equal(
    response,
    normalizeResponse({
      statusCode: 400,
      json: message,
    })
  )
})

test(`handleError - HttpError with options`, async () => {
  const message = { foo: true }
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400, message, {
      expose: false,
      headers: { 'x-test': 'test' },
    }),
  } as HyprContext
  const response = normalizeResponse({})
  handleError(event, ctx, response)

  assert.equal(
    response,
    normalizeResponse({
      statusCode: 400,
      headers: {
        'x-test': 'test',
      },
      json: {
        detail: status.message[400],
      },
    })
  )
})

test(`handleError - returns html`, async () => {
  const event = {
    headers: {
      [httpHeaders.Accept]: 'text/html',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400, 'whoops'),
  } as HyprContext
  const response = normalizeResponse({})
  handleError(event, ctx, response)

  assert.ok(response.html?.includes('whoops'))
})

test.run()
