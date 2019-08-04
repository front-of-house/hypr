# sstack
A minimal approach to serverless middleware.
```bash
npm i sstack --save
```

### Why
Serverless is simple and fast; its middleware should be too. `sstack` aims to avoid
boilerplate and borrowed legacy APIs to keep things within the serverless frame
of mind.

### How
`sstack` works as a series of higher order functions, each wrapping its
successor. Data is mutated directly, and is passed linearly. This makes
reasoning about and debugging your data much easier.

Also, in `sstack` applications, all handlers are `async`.

### Available Middlewares
- [`json`](https://github.com/estrattonbailey/sstack/tree/master/packages/json): body parsing and stringifying
- [`errors`](https://github.com/estrattonbailey/sstack/tree/master/packages/errors): simple error formatting
- [`cookies`](https://github.com/estrattonbailey/sstack/tree/master/packages/cookies): cookie parsing
- [`validate`](https://github.com/estrattonbailey/sstack/tree/master/packages/validate): request & response schema validation
- [`helmet`](https://github.com/estrattonbailey/sstack/tree/master/packages/helmet): base security headers
- `jwt`: validate JWT tokens (coming soon)

# Usage
A normal async serverless function might look like this:
```javascript
exports.handler = async (event, context) => {
  const { email } = JSON.parse(event.body)

  // ... do some work

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true })
  }
}
```

With `sstack`, it looks like this:
```javascript
const { sstack, main } = require('sstack')
const { parse, stringify } = require('@sstack/json')

exports.handler = sstack([
  parse(),
  main((event, context) => {
    const { email } = ev.body

    // ... do some work

    return {
      body: { success: true }
    }
  }),
  stringify()
])
```

Here, the `sstack` function creates a new middleware stack, and the `main`
function wraps a normal serverless function definition so it can be processed
like any other middleware. `@sstack/json` simply provides built-in body parsing
and response stringifying.

## Middleware
Middlewares in `sstack` are very simple, and have very few rules.

Every middleware function is passed a single paramter, `handler`, which contains
the entire context of the function call.

Here's a very simple *valid* middleware, deconstructed:
```javascript
function middleware (handler) {
  const { event, context, response } = handler
}
```

Note that it doesn't do anything. To be useful, middlewares mutate the function
context values directly.

Perhaps your application makes use of a logging library, and you'd like it to be
available to all of your functions. Simple define a middleware in your stack,
and its mutated values will be available to all subsequent middlewares.
```javascript
const logger = require('./my-logger.js')

exports.handler = sstack([
  handler => {
    handler.context.logger = logger
  },
  main((event, context) => {
    const { logger } = context

    // ... do some work
  }),
  stringify()
])
```

## Errors
Error handling in `sstack` is very straighforward. Instead of cluttering up the
main stack with error handlers, if an error is thrown, `sstack` will run a
separate error stack that you can define.

```javascript
exports.handler = sstack([
  // ... main stack
], [
  // ... error stack
])
```

Each middleware in the error stack will receive a special property
on `handler.error` that contains the orginal `Error`. Use this to create a
response, or mutate it and pass it along to subsequent middlewares.

```javascript
exports.handler = sstack([ ... ], [
  handler => {
    handler.response.body = handler.error.message
  }
])
```

A separate error stack allows error handlers to be composed in the same fashion
as the main stack.

```javascript
const { stringify } = require('@sstack/json')

exports.handler = sstack([ ... ], [
  // create a json response
  handler => {
    handler.response.statusCode = handler.error.statusCode || 500
    handler.response.body = {
      code: handler.error.statusCode || 500,
      error: handler.error.message
    }
  },
  stringify()
])
```


## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
