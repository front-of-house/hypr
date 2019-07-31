const Ajv = require('ajv')
const error = require('http-errors')

function request (schema, options = {}) {
  const ajv = new Ajv(Object.assign({
    allErrors: true
  }, options.ajv || {}))

  return handler => {
    if (!schema) return

    const ev = handler.event

    if (!ev.body) {
      const e = error(422, `Request body was empty.`)
      e.title = 'Invalid Request Body'
      throw e
    }

    const validate = ajv.compile(schema)
    const valid = validate(ev.body)

    if (!valid) {
      const e = error(400, ajv.errorsText(validate.errors))
      e.title = 'Invalid Request Body'
      throw e
    }
  }
}

function response (schema, options = {}) {
  const ajv = new Ajv(Object.assign({
    allErrors: true
  }, options.ajv || {}))

  return handler => {
    if (!schema) return

    const res = handler.response

    if (!res.body) {
      const e = error(422, `Response body was empty.`)
      e.title = 'Invalid Response Body'
      throw e
    }

    const validate = ajv.compile(schema)
    const valid = validate(res.body)

    if (!valid) {
      const e = error(400, ajv.errorsText(validate.errors))
      e.title = 'Invalid Response Body'
      throw e
    }
  }
}

module.exports = {
  request,
  response
}
