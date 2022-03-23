import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import * as headers from '../lib/headers'
import * as methods from '../lib/methods'
import { cors } from '../cors'
import { HyprEvent, HyprContext } from '../hypr'
import { normalizeResponse } from '../lib/normalizeResponse'

const test = suite('cors')

const event = {} as unknown as HyprEvent
const context = {} as HyprContext
const response = normalizeResponse({})

test(`cors - base`, () => {
  cors()(event, context, Object.assign({}, response))
  assert.equal(response.headers[headers.AccessControlAllowOrigin], undefined)
})

test(`cors - allowOrigin`, () => {
  const event = {
    headers: {
      origin: 'foo',
    },
  } as unknown as HyprEvent

  const a = Object.assign({}, response)
  cors({ allowOrigin: 'foo' })(event, context, a)
  assert.equal(a.headers[headers.AccessControlAllowOrigin], 'foo')

  const b = Object.assign({}, response)
  cors({ allowOrigin: ['foo', 'bar'] })(event, context, b)
  assert.equal(b.headers[headers.AccessControlAllowOrigin], 'foo')

  const c = Object.assign({}, response)
  cors({ allowOrigin: ['bar'] })(event, context, c)
  assert.equal(c.headers[headers.AccessControlAllowOrigin], 'bar')

  const d = Object.assign({}, response)
  cors({ allowOrigin: ['*'] })(event, context, d)
  assert.equal(d.headers[headers.AccessControlAllowOrigin], 'foo')
})

test(`cors - allowCredentials`, () => {
  const res = Object.assign({}, response)
  cors({ allowCredentials: true })(event, context, res)
  assert.equal(response.headers[headers.AccessControlAllowCredentials], 'true')
})

test(`cors - allowHeaders`, () => {
  const res = Object.assign({}, response)
  cors({ allowHeaders: 'foo' })(event, context, res)
  assert.equal(response.headers[headers.AccessControlAllowHeaders], 'foo')
})

test(`cors - allowMethods`, () => {
  const res = Object.assign({}, response)
  cors({ allowMethods: 'foo' })(event, context, res)
  assert.equal(response.headers[headers.AccessControlAllowMethods], 'foo')
})

test(`cors - exposeHeaders`, () => {
  const res = Object.assign({}, response)
  cors({ exposeHeaders: 'foo' })(event, context, res)
  assert.equal(response.headers[headers.AccessControlExposeHeaders], 'foo')
})

test(`cors - requestHeaders`, () => {
  const res = Object.assign({}, response)
  cors({ requestHeaders: 'foo' })(event, context, res)
  assert.equal(response.headers[headers.AccessControlRequestHeaders], 'foo')
})

test(`cors - requestMethods`, () => {
  const res = Object.assign({}, response)
  cors({ requestMethods: 'foo' })(event, context, res)
  assert.equal(response.headers[headers.AccessControlRequestMethods], 'foo')
})

test(`cors - maxAge`, () => {
  const res = Object.assign({}, response)
  cors({ maxAge: 600 })(event, context, res)
  assert.equal(response.headers[headers.AccessControlMaxAge], '600')
})

test(`cors - cacheControl`, () => {
  const one = Object.assign({}, response)
  cors({ cacheControl: 'foo' })(event, context, one)
  assert.equal(response.headers[headers.CacheControl], undefined)

  const two = Object.assign({}, response)
  cors({ cacheControl: 'foo' })({ ...event, httpMethod: methods.OPTIONS }, context, two)
  assert.equal(response.headers[headers.CacheControl], 'foo')
})

test.run()
