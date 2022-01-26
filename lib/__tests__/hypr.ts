import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import status from 'statuses'

import { stack, main, Context, normalizeResponse, errorHandler, enhanceEvent, ContextError, HttpError } from '../hypr'

const test = suite('hypr')

const event = {
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
}
const context = {} as Context

test('normalizeResponse - html', async () => {
  const res = normalizeResponse({
    html: 'body',
  })
  assert.ok(res.headers && String(res.headers['content-type']).includes('text/html'))
  assert.equal(res.body, 'body')
})

test('normalizeResponse - json', async () => {
  const json = { foo: true }
  const res = normalizeResponse({ json })
  assert.ok(res.headers && String(res.headers['content-type']).includes('application/json'))
  assert.equal(res.body, JSON.stringify(json))
})

test('normalizeResponse - xml', async () => {
  const xml = '</>'
  const res = normalizeResponse({ xml })
  assert.ok(res.headers && String(res.headers['content-type']).includes('application/xml'))
  assert.equal(res.body, xml)
})

test('normalizeResponse - statusCode', async () => {
  const res = normalizeResponse({ statusCode: 400 })
  assert.equal(res.statusCode, 400)
})

test('normalizeResponse - headers', async () => {
  const res = normalizeResponse({ headers: { Host: 'foo' } })
  assert.ok(res.headers && res.headers.Host === 'foo')
})

test('normalizeResponse - multiValueHeaders', async () => {
  const res = normalizeResponse({
    multiValueHeaders: { 'Set-Cookie': ['foo', 'bar'] },
  })
  assert.ok(res.multiValueHeaders && res.multiValueHeaders['Set-Cookie'][0] === 'foo')
})

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
  const ctx = {
    error: new Error('foo'),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  assert.equal(response, {
    statusCode: 500,
    json: {
      detail: status.message[500],
    },
  })
})

test(`errorHandler - HttpError`, async () => {
  const ctx = {
    error: new HttpError(400),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  assert.equal(response, {
    statusCode: 400,
    json: {
      detail: status.message[400],
    },
  })
})

test(`errorHandler - HttpError with message`, async () => {
  const message = 'whoops'
  const ctx = {
    error: new HttpError(400, message),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  assert.equal(response, {
    statusCode: 400,
    json: {
      detail: message,
    },
  })
})

test(`errorHandler - HttpError with JSON message`, async () => {
  const message = { foo: true }
  const ctx = {
    error: new HttpError(400, message),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  assert.equal(response, {
    statusCode: 400,
    json: message,
  })
})

test(`errorHandler - HttpError with options`, async () => {
  const message = { foo: true }
  const ctx = {
    error: new HttpError(400, message, {
      expose: false,
      headers: { 'x-test': 'test' },
    }),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  assert.equal(response, {
    statusCode: 400,
    headers: {
      'x-test': 'test',
    },
    json: {
      detail: status.message[400],
    },
  })
})

test(`enhanceEvent - application/json`, async () => {
  const e = {
    ...event,
    headers: {
      'content-type': 'application/json',
    },
    body: '{"foo":true}',
  }
  const ev = enhanceEvent(e)

  assert.equal(ev.json?.foo, true)
})

test(`enhanceEvent - unknown content type`, async () => {
  const e = {
    ...event,
    headers: {},
    body: '{"foo":true}',
  }
  const ev = enhanceEvent(e)

  assert.equal(ev.json, undefined)
})

test('base', async () => {
  const run = stack([
    (ev) => {
      ev.auth = true
    },
    (ev) => {
      return {
        statusCode: 200,
        json: {
          auth: ev.auth,
        },
      }
    },
  ])
  const response = await run(event, context)

  if (!response.body) {
    throw new Error('fail')
    return
  }

  assert.equal(JSON.parse(response.body), { auth: true })
})

test(`base with JSON`, async () => {
  let plan = 0

  const json = { foo: true }
  const run = stack(
    [
      (event) => {
        assert.equal(event.json, json)
        plan++
        return { statusCode: 204 }
      },
    ],
    [
      (event, ctx) => {
        console.log(ctx.error)
      },
    ]
  )
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
      () => {
        return { statusCode: 200 }
      },
    ],
    [
      () => {
        plan++
      },
      (ev, ctx) => {
        return {
          statusCode: 400,
          body: (ctx.error as Error).message,
        }
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

test(`nothing returned`, async () => {
  const run = stack([() => {}], [() => {}])
  const response = await run(event, context)

  assert.equal(response.statusCode, 500)
})

test(`main - single fn`, async () => {
  const response = await main((e) => ({ statusCode: 204 }))(event, context)

  if (!response) {
    throw new Error('no response')
  } else assert.equal(response.statusCode, 204)
})

test(`main - methods`, async () => {
  const e = Object.assign({}, event, { httpMethod: 'POST' })
  const response = await main({
    post(e) {
      return {
        statusCode: 200,
      }
    },
  })(e, context)

  if (!response) {
    throw new Error('no response')
  } else assert.equal(response.statusCode, 200)
})

test(`main - not method match`, async () => {
  try {
    await main({
      post(e) {
        return {
          statusCode: 200,
        }
      },
    })(event, context)
  } catch (e) {
    assert.equal(e.statusCode, 405)
  }
})

test(`stack + main`, async () => {
  let plan = 0

  const run = stack([
    main({
      post() {
        plan++
      },
    }),
  ])
  const response = await run(event, context)

  assert.equal(plan, 0)
  assert.equal(response.statusCode, 405)
})

test.run()
