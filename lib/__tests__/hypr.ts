import tap from 'tap'
import status from 'statuses'

import { stack, main, Context, normalizeResponse, errorHandler, ContextError, HttpError } from '../hypr'

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

tap.test('normalizeResponse - html', async (t) => {
  const res = normalizeResponse({
    html: 'body',
  })
  t.ok(res.headers && String(res.headers['Content-Type']).includes('text/html'))
  t.equal(res.body, 'body')
})

tap.test('normalizeResponse - json', async (t) => {
  const json = { foo: true }
  const res = normalizeResponse({ json })
  t.ok(res.headers && String(res.headers['Content-Type']).includes('application/json'))
  t.equal(res.body, JSON.stringify(json))
})

tap.test('normalizeResponse - xml', async (t) => {
  const xml = '</>'
  const res = normalizeResponse({ xml })
  t.ok(res.headers && String(res.headers['Content-Type']).includes('application/xml'))
  t.equal(res.body, xml)
})

tap.test('normalizeResponse - statusCode', async (t) => {
  const res = normalizeResponse({ statusCode: 400 })
  t.equal(res.statusCode, 400)
})

tap.test('normalizeResponse - headers', async (t) => {
  const res = normalizeResponse({ headers: { Host: 'foo' } })
  t.ok(res.headers && res.headers.Host === 'foo')
})

tap.test('normalizeResponse - multiValueHeaders', async (t) => {
  const res = normalizeResponse({
    multiValueHeaders: { 'Set-Cookie': ['foo', 'bar'] },
  })
  t.ok(res.multiValueHeaders && res.multiValueHeaders['Set-Cookie'][0] === 'foo')
})

tap.test(`HttpError`, async (t) => {
  const err = new HttpError(400)

  t.same(err, {
    name: status.message[400],
    statusCode: 400,
    message: '',
    expose: true,
  })
})

tap.test(`HttpError - 500`, async (t) => {
  const err = new HttpError(500)
  t.equal(err.expose, false)
})

tap.test(`HttpError - 400 w/ message`, async (t) => {
  const err = new HttpError(400, `foo`)
  t.equal(err.message, 'foo')
})

tap.test(`HttpError - 400 w/ JSON message`, async (t) => {
  const message = { foo: true }
  const err = new HttpError(400, message)
  t.same(err.message, message)
})

tap.test(`HttpError - 500 w/ message`, async (t) => {
  const err = new HttpError(500, `foo`)
  t.equal(err.message, 'foo')
  t.equal(err.expose, false)
})

tap.test(`HttpError - 400 expose = false`, async (t) => {
  const err = new HttpError(400, `foo`, { expose: false })
  t.equal(err.expose, false)
})

tap.test(`HttpError - headers`, async (t) => {
  const err = new HttpError(400, `foo`, {
    headers: { Foo: 'bar' },
  })
  t.equal(err.headers?.Foo, 'bar')
})

tap.test(`errorHandler - Error`, async (t) => {
  const ctx = {
    error: new Error('foo'),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  t.same(response, {
    statusCode: 500,
    json: {
      detail: status.message[500],
    },
  })
})

tap.test(`errorHandler - HttpError`, async (t) => {
  const ctx = {
    error: new HttpError(400),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  t.same(response, {
    statusCode: 400,
    json: {
      detail: status.message[400],
    },
  })
})

tap.test(`errorHandler - HttpError with message`, async (t) => {
  const message = { foo: true }
  const ctx = {
    error: new HttpError(400, message),
  } as Context<ContextError>
  const response = errorHandler(event, ctx)

  t.same(response, {
    statusCode: 400,
    json: message,
  })
})

tap.test('base', async (t) => {
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
    t.fail()
    return
  }

  t.same(JSON.parse(response.body), { auth: true })
})

tap.test(`middleware returns early`, async (t) => {
  const run = stack([
    () => ({ body: 'middleware' }),
    () => {
      return { statusCode: 200, body: 'handler' }
    },
  ])
  const response = await run(event, context)

  t.equal(response.body, 'handler')
})

tap.test(`error stack`, async (t) => {
  t.plan(3)

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
        t.pass()
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

  t.equal(response.statusCode, 400)
  t.equal(response.body, 'foo')
})

tap.test(`catastrophic error`, async (t) => {
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

  t.equal(response.statusCode, 500)
})

tap.test(`nothing returned`, async (t) => {
  const run = stack([() => {}], [() => {}])
  const response = await run(event, context)

  t.equal(response.statusCode, 500)
})

tap.test(`main - single fn`, async (t) => {
  const response = await main((e) => ({ statusCode: 204 }))(event, context)

  if (!response) t.fail()
  else t.equal(response.statusCode, 204)
})

tap.test(`main - methods`, async (t) => {
  const e = Object.assign({}, event, { httpMethod: 'POST' })
  const response = await main({
    post(e) {
      return {
        statusCode: 200,
      }
    },
  })(e, context)

  if (!response) t.fail()
  else t.equal(response.statusCode, 200)
})

tap.test(`main - not method match`, async (t) => {
  try {
    await main({
      post(e) {
        return {
          statusCode: 200,
        }
      },
    })(event, context)
  } catch (e) {
    t.equal(e.statusCode, 405)
  }
})

tap.test(`stack + main`, async (t) => {
  const run = stack([
    main({
      post() {
        t.pass()
      },
    }),
  ])
  const response = await run(event, context)

  t.equal(response.statusCode, 405)
})
