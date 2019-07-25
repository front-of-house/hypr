function prune (src) {
  let obj = Object.assign({}, src)

  for (let key in obj) {
    if (!obj[key]) {
      delete obj[key]
    }
  }

  return obj
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

module.exports = function errors (options) {
  return handler => {
    handler.response = createResponseFromError(handler.error)
  }
}
