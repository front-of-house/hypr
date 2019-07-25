const test = require('ava')
const { parse, stringify } = require('./index.js')

test('parse', t => {
  const handler = {
    event: {
      body: JSON.stringify({
        foo: true
      })
    }
  }

  parse(handler)

  t.is(handler.event.body.foo, true)

  try {
    const res = parse('not json')
  } catch (e) {
    t.is(e.statusCode, 400)
  }
})

test('stringify', t => {
  const handler = {
    response: {
      body: {
        foo: true
      }
    }
  }

  stringify(handler)

  t.is(typeof handler.response.body, 'string')

  try {
    stringify(undefined)
  } catch (e) {
    t.is(e.statusCode, 400)
  }
})
