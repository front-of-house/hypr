async function apply (handler, stack) {
  let i = 0

  return (async function run (handled) {
    await handled

    const next = stack[++i]

    return next ? run(next(handler)) : handler
  })(stack[i] ? stack[i](handler) : {})
}

function handler (fn) {
  return async handler => {
    const response = await fn(handler.event, handler.context)
    Object.assign(handler.response, response)
  }
}

function sstack (stack = [], error = []) {
  return async (event, context) => {
    /**
     * Normalize all keys to lowercase to match HTTP/2 spec
     */
    for (const key in event.headers) {
      event.headers[key.toLowerCase()] = event.headers[key]
    }

    /**
     * Normalize event props
     */
    if (!!event.httpMethod) {
      event.queryStringParameters = event.queryStringParameters || {}
      event.pathParameters = event.pathParameters || {}
    }

    const original = {
      event,
      context,
      response: {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {},
        body: ''
      }
    }

    let handler = Object.assign({}, original)

    try {
      handler = await apply(handler, stack)
      return handler.response
    } catch (e) {
      handler.error = e

      /**
       * Reset response for error defaults
       */
      handler.response = {
        statusCode: 500,
        body: `500 - Server Error`
      }

      try {
        handler = await apply(handler, error)
        return handler.response
      } catch (e) {
        return {
          statusCode: 500,
          body: `500 - Server Error`
        }
      }
    }
  }
}

module.exports = {
  handler,
  sstack
}
