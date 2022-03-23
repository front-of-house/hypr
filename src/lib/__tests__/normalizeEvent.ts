import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { normalizeEvent } from '../normalizeEvent'

const test = suite('normalizeEvent')

const event = normalizeEvent({
  rawUrl: '/',
  rawQuery: '',
  path: '/',
  httpMethod: 'GET',
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: {},
  multiValueQueryStringParameters: {},
  body: null,
  isBase64Encoded: false,
  requestContext: {},
  resource: '',
})

test(`normalizeEvent - application/json`, async () => {
  const e = {
    ...event,
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"foo":true}',
  }
  const ev = normalizeEvent(e)

  assert.equal(ev.json?.foo, true)
  assert.equal(ev.headers, {
    'content-type': 'application/json',
  })
})

test(`normalizeEvent - unknown content type`, async () => {
  const e = {
    ...event,
    headers: {},
    body: '{"foo":true}',
  }
  const ev = normalizeEvent(e)

  assert.equal(ev.json, undefined)
})

test.run()
