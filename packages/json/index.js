function parse (handler) {
  try {
    handler.event.body = JSON.parse(handler.event.body)
  } catch (e) {
    throw createError(400, `The request body was malformed.`)
  }
}

function stringify (handler) {
  try {
    handler.response.body = JSON.parse(handler.response.body)
  } catch (e) {
    throw createError(400, `The response body was malformed.`)
  }
}

module.exports = {
  parse,
  stringify
}
