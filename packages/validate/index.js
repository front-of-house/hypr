const Ajv = require('ajv')
const error = require('http-errors')

function request (schema, options = {}) {
  const ajv = new Ajv({ allErrors: true })

  return handler => {
    if (!schema) return

    const ev = handler.event
    const validate = ajv.compile(schema)
    const valid = validate(ev.body)

    if (!valid) {
      throw error(400, ajv.errorsText(validate.errors))
    }
  }
}

function response (schema, options = {}) {
  const ajv = new Ajv({ allErrors: true })

  return handler => {
    if (!schema) return

    const res = handler.response
    const validate = ajv.compile(schema)
    const valid = validate(res.body)

    if (!valid) {
      throw error(400, ajv.errorsText(validate.errors))
    }
  }
}

module.exports = {
  request,
  response
}
