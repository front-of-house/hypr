const test = require('ava')
const error = require('./index.js')

test('works', t => {
  const e = new Error('hello')
  e.statusCode = 400
  const handler = { error: e }

  error()(handler)

  t.is(handler.response.statusCode, 400)
  t.is(handler.response.body.errors[0].details, 'hello')
})
