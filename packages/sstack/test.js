const test = require('ava')
const { sstack, handler } = require('./index.js')

const app = fn => sstack([
  handler(fn)
])

test('success', async t => {
  const fn = app((ev, ctx) => {
    return {
      body: {
        foo: true
      }
    }
  })

  const res = await fn({}, {})

  t.is(res.body.foo, true)
})

test('error', async t => {
  const fn = app((ev, ctx) => {
    throw new Error('hello')
    return {
      body: {
        foo: true
      }
    }
  })

  const res = await fn({}, {})

  t.is(res.statusCode, 500)
  t.is(res.body.errors[0].details, 'hello')
})

test('chainable', async t => {
  const app = fn => sstack([
    handler => {
      handler.response.headers = {
        bar: true
      }
    },
    handler(fn),
    handler => {
      handler.response.body.foo = false
    }
  ])

  const fn = app((ev, ctx) => {
    return {
      body: {
        foo: true
      }
    }
  })

  const res = await fn({}, {})

  t.is(res.body.foo, false)
  t.is(res.headers.bar, true)
})
