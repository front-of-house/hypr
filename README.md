# hypr

[![npm version](https://img.shields.io/npm/v/hypr?style=flat&colorA=4488FF&colorB=4488FF)](https://www.npmjs.com/package/hypr) [![test coverage](https://img.shields.io/coveralls/github/sure-thing/hypr?style=flat&colorA=223355&colorB=223355)](https://coveralls.io/github/sure-thing/hypr?branch=main) [![npm bundle size](https://badgen.net/bundlephobia/min/hypr?color=223355&labelColor=223355)](https://bundlephobia.com/result?p=hypr)

Minimalist serverless middleware and utilities. Get started instantly with [Presta](https://presta.run/).

```
npm i hypr
```

## Usage

Define a `stack` of serverless handlers. Middleware handlers should mutate
`event` and `context`. All returned responses are _deeply merged_ and returned
to the client.

```javascript
import * as hypr from 'hypr'
import { helmet } from 'hypr/helmet'

export const route = '*'

export const handler = hypr.stack([
  (event, context) => {
    const user = getLoggedInUser(event) // your code here
    context.user = user
  },
  (event, context) => {
    return {
      json: { message: `Hello, ${context.user.firstName}!` }
    }
  }
  helmet(),
])
```

To define specific HTTP methods, use `hypr.main`.

```javascript
export const handler = hypr.stack([
  hypr.main({
    get(event, context) {
      return {
        json: { message: 'GET request' }
      }
    },
    post(event, context) {
      return {
        json: { message: 'POST request' }
      }
    }
  }),
  ...
])
```

For errors, throw a `HttpError`.

```javascript
const authMiddleware = (event, context) => {
  const user = getLoggedInUser(event) // your code here
  context.user = user
}

const authGuard = (event, context) => {
  if (!context.user) {
    throw new hypr.HttpError(401, 'You are not authorized to view this page')
  }
}

export const handler = hypr.stack([
  authMiddleware,
  authGuard,
  (event, context) => {
    return {
      json: { message: `You are authenticated.` },
    }
  },
])
```

You can also pass JSON to `HttpError`.

```javascript
throw new hypr.HttpError(400, {
  code: `auth`,
  error: `You are not authorized to view this page`,
})
```

## Available middlewares

Hypr bundles a few useful middlewares.

#### `hypr/helmet`

Protect your APIs with common security headers. Inspired by
[helmet](https://github.com/helmetjs/helmet).

```javascript
import { stack, main } from 'hypr'
import { helmet } from 'hypr/helmet'

export const handler = stack([
  main(...),
  helmet(),
])
```

#### `hypr/cookies`

Parse and serialize cookies using
[sugarcookie](https://github.com/sure-thing/sugarcookie). `thaw` and `bake` are
just aliases for `parse` and `serialize` exports.

```javascript
import { stack, main } from 'hypr'
import { thaw, bake } from 'hypr/cookies'

export const handler = stack([
  thaw(), // reads from `event.headers.cookie`
  main((event) => {
    const { session_id } = event.cookies
    const { id, expiresAt } = refreshSession(session_id)

    return {
      statusCode: 204,
      cookies: {
        // shorthand, no options
        cookie_name: 'value',
        // with options
        session_id: [
          id,
          {
            expires: expiresAt,
            secure: true,
            httpOnly: true,
          },
        ],
      },
    }
  }),
  bake(), // serializes to response.headers['set-cookie']
])
```

### Creating middleware

Middleware run before and/or after any main handlers. Anything running _before_
should attach props to `event` or `context`. Anything running _after_ should read
values from the `response` and merge in new values.

For this reason, middlewares are passed a third, non-standard, parameter
`response`. See the available
[cookie](https://github.com/sure-thing/hypr/blob/main/lib/cookies.ts) middleware
for examples.

```javascript
import { createHandler } from 'hypr'

export const set204IfNoBodyMiddleware = createHandler((options) => {
  return (event, context, response) => {
    if (!response.body) {
      return { statusCode: 204 }
      // or mutate with response.statusCode = 204
    }
  }
})
```

## License

MIT License © [Sure Thing](https://github.com/sure-thing)
