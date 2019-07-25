const error = require('http-errors')

function parse (options = {}) {
  const {
    type = 'application/json'
  } = options

  return handler => {
    const ev = handler.event

    if (ev.httpMethod === 'GET') return

    if (ev.headers['content-type'] !== type) {
      throw error(400, `Specified ${type} but request body was malformed`)
    }

    try {
      ev.body = JSON.parse(ev.body)
    } catch (e) {
      throw error(400, `The request body was malformed.`)
    }
  }
}

function stringify (options = {}) {
  const {
    type = 'application/json'
  } = options

  return handler => {
    const res = handler.response

    try {
      res.body = JSON.stringify(res.body)
      res.headers = {
        ...res.headers,
        'content-type': type
      }
    } catch (e) {
      throw error(400, `The response body was malformed.`)
    }
  }
}

module.exports = {
  parse,
  stringify
}
