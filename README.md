# hypr

[![npm version](https://img.shields.io/npm/v/hypr?style=flat&colorA=4488FF&colorB=4488FF)](https://www.npmjs.com/package/hypr) [![test coverage](https://img.shields.io/coveralls/github/sure-thing/hypr?style=flat&colorA=223355&colorB=223355)](https://coveralls.io/github/sure-thing/hypr?branch=main) [![npm bundle size](https://badgen.net/bundlephobia/min/hypr?color=223355&labelColor=223355)](https://bundlephobia.com/result?p=hypr)

Minimalist serverless middleware and utilities. Get started instantly with [Presta](https://presta.run/).

```
npm i hypr
```

## Usage

Define a `stack` of serverless handlers. Middleware handlers should mutate
`event` and `context`. Returned responses are deeply merged and returned to the
client.

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

## License

MIT License © [Sure Thing](https://github.com/sure-thing)


[![Coverage Status](https://coveralls.io/repos/github/sure-thing/hypr/badge.svg?branch=)](https://coveralls.io/github/sure-thing/hypr?branch=)

