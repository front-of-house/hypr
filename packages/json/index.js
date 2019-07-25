const error = require('http-errors')

function parse (handler) {
  try {
    handler.event.body = JSON.parse(handler.event.body)
  } catch (e) {
    throw error(400, `The request body was malformed.`)
  }
}

function stringify (handler) {
  try {
    handler.response.body = JSON.stringify(handler.response.body)
  } catch (e) {
    throw error(400, `The response body was malformed.`)
  }
}

module.exports = {
  parse,
  stringify
}
