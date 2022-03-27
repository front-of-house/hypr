import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import status from 'statuses'

import { stack, main, errorHandler, HyprContext, serializeBody, HttpError, HyprEvent } from '../hypr'
import { normalizeEvent } from '../lib/normalizeEvent'
import { normalizeResponse } from '../lib/normalizeResponse'
import * as httpHeaders from '../lib/headers'

const test = suite('hypr')

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

const context = {} as HyprContext

test(`HttpError`, async () => {
  const err = { ...new HttpError(400) }

  assert.equal(err, {
    name: status.message[400],
    statusCode: 400,
    message: '',
    expose: true,
  })
})

test(`HttpError - 500`, async () => {
  const err = new HttpError(500)
  assert.equal(err.expose, false)
})

test(`HttpError - 400 w/ message`, async () => {
  const err = new HttpError(400, `foo`)
  assert.equal(err.message, 'foo')
})

test(`HttpError - 400 w/ JSON message`, async () => {
  const message = { foo: true }
  const err = new HttpError(400, message)
  assert.equal(err.message, message)
})

test(`HttpError - 500 w/ message`, async () => {
  const err = new HttpError(500, `foo`)
  assert.equal(err.message, 'foo')
  assert.equal(err.expose, false)
})

test(`HttpError - 400 expose = false`, async () => {
  const err = new HttpError(400, `foo`, { expose: false })
  assert.equal(err.expose, false)
})

test(`HttpError - headers`, async () => {
  const err = new HttpError(400, `foo`, {
    headers: { Foo: 'bar' },
  })
  assert.equal(err.headers?.Foo, 'bar')
})

test(`errorHandler - Error`, async () => {
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new Error('foo'),
  } as HyprContext
  const response = normalizeResponse({})
  errorHandler(event, ctx, response)

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

test(`errorHandler - HttpError`, async () => {
  const event = {
    headers: {
      [httpHeaders.Accept]: 'application/json',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400),
  } as HyprContext
  const response = normalizeResponse({})
  errorHandler(event, ctx, response)

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

test(`errorHandler - HttpError with message`, async () => {
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
  errorHandler(event, ctx, response)

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

test(`errorHandler - HttpError with JSON message`, async () => {
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
  errorHandler(event, ctx, response)

  assert.equal(
    response,
    normalizeResponse({
      statusCode: 400,
      json: message,
    })
  )
})

test(`errorHandler - HttpError with options`, async () => {
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
  errorHandler(event, ctx, response)

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

test(`errorHandler - returns html`, async () => {
  const event = {
    headers: {
      [httpHeaders.Accept]: 'text/html',
    },
  } as unknown as HyprEvent
  const ctx = {
    error: new HttpError(400, 'whoops'),
  } as HyprContext
  const response = normalizeResponse({})
  errorHandler(event, ctx, response)

  assert.ok(response.html?.includes('whoops'))
})

test('serializeBody - html', async () => {
  const res = serializeBody(
    normalizeResponse({
      html: 'body',
    })
  )
  assert.ok(res.headers && String(res.headers['content-type']).includes('text/html'))
  assert.equal(res.body, 'body')
})

test('serializeBody - json', async () => {
  const json = { foo: true }
  const res = serializeBody(normalizeResponse({ json }))
  assert.ok(res.headers && String(res.headers['content-type']).includes('application/json'))
  assert.equal(res.body, JSON.stringify(json))
})

test('serializeBody - xml', async () => {
  const xml = '</>'
  const res = serializeBody(normalizeResponse({ xml }))
  assert.ok(res.headers && String(res.headers['content-type']).includes('application/xml'))
  assert.equal(res.body, xml)
})

test('serializeBody - statusCode', async () => {
  const res = serializeBody(normalizeResponse({ statusCode: 400 }))
  assert.equal(res.statusCode, 400)
})

test('serializeBody - headers', async () => {
  const res = serializeBody(normalizeResponse({ headers: { Host: 'foo' } }))
  assert.ok(res.headers && res.headers.host === 'foo')
})

test('serializeBody - multiValueHeaders', async () => {
  const res = serializeBody(
    normalizeResponse({
      multiValueHeaders: { 'set-cookie': ['foo', 'bar'] },
    })
  )
  assert.ok(res.multiValueHeaders && res.multiValueHeaders['set-cookie'][0] === 'foo')
})

test('serializeBody - existing content-type', async () => {
  const res = serializeBody(
    normalizeResponse({
      headers: {
        'content-type': 'text/plain',
      },
      json: { auth: true },
    })
  )
  assert.equal(res?.headers?.['content-type'], 'text/plain')
})

test('serializeBody - content-length', async () => {
  const res = serializeBody(
    normalizeResponse({
      body: '20€',
    })
  )
  assert.equal(res?.headers?.['content-length'], '5')
})

test('base', async () => {
  const run = stack([
    (ev) => {
      ev.auth = true
    },
    (ev, ctx, res) => {
      Object.assign(res, {
        statusCode: 200,
        json: {
          auth: ev.auth,
        },
      })
    },
  ])
  const response = await run(event, context)

  if (!response.body) {
    throw new Error('fail')
    return
  }

  assert.equal(JSON.parse(response.body), { auth: true })
  assert.equal(response.statusCode, 200)
})

test('response passing', async () => {
  const run = stack([
    (ev, ctx, res) => {
      res.statusCode = 302
    },
    (ev, ctx, res) => {
      res.statusCode = 201
    },
  ])

  const response = await run(event, context)

  assert.equal(response.statusCode, 201)
})

test('exit early', async () => {
  const run = stack([
    (ev, ctx, res) => {
      res.headers['Host'] = 'foo'
    },
    (ev, ctx, res) => {
      return {
        statusCode: 302,
      }
    },
    (ev, ctx, res) => {
      res.statusCode = 201
    },
  ])

  const response = await run(event, context)

  assert.equal(response.statusCode, 302)
  assert.equal(response.headers?.host, 'foo')
})

test('headers get normalized on the way', async () => {
  const run = stack([
    (ev, ctx, res) => {
      res.headers['Content-Type'] = 'json'
    },
    (ev, ctx, res) => {
      res.headers['content-type'] = 'html'
    },
  ])

  const response = await run(event, context)

  assert.equal(response?.headers?.['content-type'], 'html')
})

test(`base with JSON`, async () => {
  let plan = 0

  const json = { foo: true }
  const run = stack([
    (event) => {
      assert.equal(event.json, json)
      plan++
      return { statusCode: 204 }
    },
  ])
  await run(
    {
      ...event,
      body: JSON.stringify(json),
      headers: {
        'content-type': 'application/json',
      },
    },
    context
  )

  assert.equal(plan, 1)
})

test(`error stack`, async () => {
  let plan = 0

  const run = stack(
    [
      () => {
        throw new Error('foo')
      },
      (ev, ctx, res) => {
        res.statusCode = 200
      },
    ],
    [
      () => {
        plan++
      },
      (ev, ctx, res) => {
        Object.assign(res, {
          statusCode: 400,
          body: (ctx.error as Error).message,
        })
      },
    ]
  )
  const response = await run(event, context)

  assert.equal(plan, 1)
  assert.equal(response.statusCode, 400)
  assert.equal(response.body, 'foo')
})

test(`catastrophic error`, async () => {
  const run = stack(
    [
      () => {
        throw new Error('foo')
      },
    ],
    [
      () => {
        throw new Error('foo')
      },
    ]
  )
  const response = await run(event, context)

  assert.equal(response.statusCode, 500)
})

test(`main - single fn`, async () => {
  const response = normalizeResponse({})

  await main((e) => ({ statusCode: 204 }))(event, context, response)

  if (!response) {
    throw new Error('no response')
  } else assert.equal(response.statusCode, 204)
})

test(`main - methods`, async () => {
  const e = Object.assign({}, event, { httpMethod: 'POST' })
  let response = normalizeResponse({})
  await main({
    post(e, c) {
      return {
        statusCode: 200,
      }
    },
  })(e, context, response)

  if (!response) {
    throw new Error('no response')
  } else assert.equal(response.statusCode, 200)
})

test(`main - not method match`, async () => {
  let response = normalizeResponse({})

  try {
    await main({
      post(e) {
        return {
          statusCode: 200,
        }
      },
    })(event, context, response)
  } catch (e) {
    if (e instanceof HttpError) {
      assert.equal(e.statusCode, 405)
    }
  }
})

test(`stack + main`, async () => {
  let plan = 0

  const run = stack([
    main({
      post(ev, ctx) {
        plan++
        return {
          statusCode: 201,
        }
      },
    }),
  ])
  const response = await run(event, context)

  assert.equal(plan, 0)
  assert.equal(response.statusCode, 405)
})

test.run()
