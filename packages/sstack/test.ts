import test from 'ava';
import { sstack, handler, Handler, Context } from './index';

const app = (fn: Handler) => sstack([
  handler(fn)
])

const event = {
  httpMethod: 'GET',
  path: '/',
  headers: {},
  body: '',
  queryStringParameters: {},
  isBase64Encoded: false,
};

const context = {} as Context;

test('success', async t => {
  const fn = app(async (ev, ctx) => {
    return {
      body: {
        foo: true
      }
    }
  })

  const res = await fn(event, context)
  const body = JSON.parse(res.body);

  t.is(body.foo, true)
})

test('chainable', async t => {
  const app = (fn: Handler) => sstack([
    async handler => {
      handler.response.headers = {
        bar: 'true'
      }
    },
    handler(fn),
    async handler => {
      handler.response.body.foo = false
    }
  ])

  const fn = app(async (ev, ctx) => {
    return {
      body: {
        foo: true
      }
    }
  })

  const res = await fn(event, context)
  const body = JSON.parse(res.body);

  t.is(body.foo, false)
  t.is(res.headers.bar, 'true')
})
