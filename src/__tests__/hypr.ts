import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import status from 'statuses'

import { stack, main, HyprContext, HttpError } from '../hypr'
import { normalizeEvent } from '../lib/normalizeEvent'
import { normalizeResponse } from '../lib/normalizeResponse'

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

test('will not exit early', async () => {
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

  assert.equal(response.statusCode, 201)
  assert.equal(response.headers?.host, 'foo')
})

test('if early response, skips main', async () => {
  const run = stack([
    (ev, ctx, res) => {
      return {
        statusCode: 302,
      }
    },
    main((ev, ctx) => {
      return {
        statusCode: 201,
      }
    }),
    (ev, ctx, res) => {
      res.headers['x-test'] = 'foo'
    }
  ])

  const response = await run(event, context)

  assert.equal(response.statusCode, 302)
  assert.equal(response.headers?.['x-test'], 'foo')
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
