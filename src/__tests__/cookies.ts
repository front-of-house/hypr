import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { stack, HyprEvent, HyprContext } from '../hypr'
import { normalizeEvent } from '../lib/normalizeEvent'
import { normalizeResponse } from '../lib/normalizeResponse'
import * as headers from '../lib/headers'
import { thaw, bake, parse, serialize } from '../cookies'

const test = suite('cookies')

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

test('cookies - thaw', async () => {
  const event = {
    headers: {
      cookie: 'foo=bar; json={"id":1}; invalid={"id:1}',
    },
  } as unknown as HyprEvent

  thaw()(event, {} as HyprContext, normalizeResponse({}))

  assert.equal(event.cookies.foo, 'bar')
  assert.equal(event.cookies.json, { id: 1 })
  assert.equal(event.cookies.invalid, '{"id:1}')
})

test('cookies - bake', async () => {
  const res = normalizeResponse({
    cookies: {
      foo: [
        'bar',
        {
          secure: true,
        },
      ],
      basic: 'bar',
      json: [
        { id: 1 },
        {
          secure: true,
        },
      ],
    },
  })
  bake()({} as unknown as HyprEvent, {} as HyprContext, res)

  if (res && res.multiValueHeaders) {
    assert.equal(res.multiValueHeaders[headers.SetCookie], ['foo=bar; Secure', 'basic=bar', 'json={"id":1}; Secure'])
  } else {
    throw 'fail'
  }
})

test('cookies - aliases', () => {
  assert.ok(parse)
  assert.ok(serialize)
})

test('cookies - e2e', async () => {
  let plan = 0

  const ev = {
    ...event,
    headers: {
      cookie: 'foo=bar',
    },
  } as unknown as HyprEvent
  const context = {} as HyprContext
  const res = await stack([
    thaw(),
    (event, ctx, response) => {
      assert.equal(event.cookies.foo, 'bar')
      plan++
      Object.assign(response, {
        cookies: {
          baz: [
            'qux',
            {
              secure: true,
            },
          ],
        },
      })
    },
    bake(),
  ])(ev, context)

  assert.equal(plan, 1)

  // console.log(res)

  if (res && res.multiValueHeaders) {
    assert.equal(res.multiValueHeaders[headers.SetCookie], ['baz=qux; Secure'])
  } else {
    throw 'fail'
  }
})

test.run()
