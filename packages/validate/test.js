const test = require('ava')
const { request, response } = require('./index.js')

test('pass', t => {
  const handler = {
    event: {
      body: {
        foo: true
      }
    }
  }

  try {
    request({
      properties: {
        foo: {
          type: 'boolean'
        }
      }
    })(handler)

    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('fail', t => {
  const handler = {
    event: {
      body: {
        foo: 'true'
      }
    }
  }

  try {
    request({
      properties: {
        foo: {
          type: 'boolean'
        }
      }
    })(handler)

    t.fail()
  } catch (e) {
    t.pass()
    t.is(e.statusCode, 400)
  }
})
