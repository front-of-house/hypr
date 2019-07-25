function prune (src) {
  let obj = Object.assign({}, src)

  for (let key in obj) {
    if (!obj[key]) {
      delete obj[key]
    }
  }

  return obj
}

async function apply (handler, stack) {
  let i = 0

  return (async function run (handled) {
    await handled

    const next = stack[++i]

    return next ? run(next(handler)) : handler
  })(stack[i] ? stack[i](handler) : {})
}

function createResponseFromError (e) {
  const {
    status,
    statusCode,
    message,
    title,
    details,
    source
  } = e

  return {
    statusCode: status || statusCode || 500,
    body: {
      errors: [
        prune({
          status: status || statusCode || 500,
          source,
          title,
          details: details || message
        })
      ]
    }
  }
}

exports.handler = fn => {
  return async handler => {
    const response = await fn(handler.event, handler.context)
    Object.assign(handler.response, response)
  }
}

exports.stack = (stack = [], error = []) => {
  return async (event, context) => {
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
      handler.response = Object.assign({}, original.response, createResponseFromError(e))

      try {
        handler = await apply(handler, error)
        return handler.response
      } catch (e) {
        return Object.assign({}, original.response, createResponseFromError(e))
      }
    }
  }
}
