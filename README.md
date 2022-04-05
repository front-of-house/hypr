# hypr

[![npm version](https://img.shields.io/npm/v/hypr?style=flat&colorA=4488FF&colorB=4488FF)](https://www.npmjs.com/package/hypr) [![test coverage](https://img.shields.io/coveralls/github/sure-thing/hypr?style=flat&colorA=223355&colorB=223355)](https://coveralls.io/github/sure-thing/hypr?branch=main) [![npm bundle size](https://badgen.net/bundlephobia/min/hypr?color=223355&labelColor=223355)](https://bundlephobia.com/result?p=hypr)

Minimalist serverless API framework. Get started instantly with [Presta](https://presta.run/).

```bash
npm i hypr
```

Hypr is little more than a thin wrapper around a normal AWS-lambda-flavored
serverless function. That means you can use it on AWS, Netlify, or any other
platform that supports the `(Event, Context) => Response` pattern. If you're
using a framework like [Presta](https://presta.run), you can take this pattern
to even more platforms, like Cloudflare and Vercel.

## Usage

Hypr approaches middleware as a "stack". A request comes in, travels linearly
through the stack, and is returned as a response on the other end.

A simple hypr-wrapped lambda that returns JSON might look like this:

```typescript
import * as hypr from 'hypr'

export const handler = hypr.stack([
  hypr.main((ev, ctx) => {
    return {
      statusCode: 200,
      json: {
        auth: false,
      },
    }
  }),
])
```

### Errors

Throw errors are handled automatically and serialized to JSON or HTML depending
on the `Accept` header of the HTTP request. For more control, throw hypr
`HttpError`s, which allow you to specify status codes, messaging, and headers.

```typescript
import * as hypr from 'hypr'

export const handler = hypr.stack([
  hypr.main((ev, ctx) => {
    if (!ctx.user) {
      throw new hypr.HttpError(403, `Please check your API token and try again.`)
    }

    return {
      statusCode: 200,
      json: {
        auth: false,
      },
    }
  }),
])
```

For more control, or to access errors for telemetry, provide an "error stack" to
`hypr.stack`. In the event of a thrown exception, all error stack middleware
will be run with the `Error` available on `context.error`.

```typescript
export const handler = hypr.stack(
  [
    hypr.main((ev, ctx) => {
      if (!ctx.user) {
        throw new hypr.HttpError(403, `Please check your API token and try again.`)
      }

      // ...
    }),
  ],
  [
    (ev, ctx, res) => {
      console.error(ctx.error) // HttpError('Please check...')
    },
  ]
)
```

### Middleware

Middleware can be added on either side of the `main` handler within the
response stack. They can do everything from parse cookies to guard against
unauthorized requests.

They look a little different from the `main` handler because they receive
a third argument: the `response`. This allows middleware to transform or perform
further processing on the response before it's sent back to the client.

```typescript
import * as hypr from 'hypr'

const isAuthenticated = hypr.createMiddleware(async (ev, ctx, res) => {
  if (ev.cookies.session) {
    const user = await getLoggedInuser(ev.cookies.session)
    if (user) {
      ctx.user = user
    } else {
      throw new hypr.HttpError(403, `Session expired, please log in.`)
    }
  } else {
    throw new hypr.HttpError(403, `Please log in.`)
  }
})

export const handler = hypr.stack([
  isAuthenticated,
  hypr.main((ev, ctx) => {
    const { user } = ctx.user
    return { ... }
  })
])
```

Middleware can also return responses. **If a response is returned from a
middleware, the `main` handler will not be run.** All other middleware will run
as normal. This allows a stack to exit early, like in the case of a redirect.

```typescript
const isAuthenticated = hypr.createMiddleware(async (ev, ctx, res) => {
  if (ev.cookies.session) {
    const user = await getLoggedInuser(ev.cookies.session)
    if (user) {
      ctx.user = user
    } else {
      return hypr.redirect(302, '/login')
    }
  } else {
    return hypr.redirect(302, '/login')
  }
})
```

### Cookies

Cookies are automatically deserialized and attached to `event.cookies`. To set
cookies, define them on the `cookies` property of your response object:

```typescript
import { stack, main } from 'hypr'

export const handler = stack([
  main((event) => {
    const { session_id } = event.cookies
    const { id, expiresAt } = refreshSession(session_id)

    return {
      statusCode: 204,
      // create cookies via the response object
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
])
```

## API

### `stack`

Required wrapper for all serverless functions utilizing hypr.

```typescript
import { stack } from 'hypr'

export const handler = hypr.stack(
  [
    // ...response middleware
  ],
  [
    // ...error middleware
  ]
)
```

### `main`

Required wrapper for the main handler of your stack.

```typescript
import { stack, main } from 'hypr'

export const handler = hypr.stack([
  // ...response middleware
  main(...)
], [
  // ...error middleware
])
```

Main can be used one of two ways. General purpose:

```typescript
main((ev, ctx) => { ... })
```

Or for specific HTTP methods. For example, to allow only `POST` (and CORS
preflights):

```typescript
main({
  post(ev, ctx) { ... }
})
```

Methods for `get` `post` `put` `patch` `delete` etc are all supported via
`<verb>(ev, ctx): HyprResponse` pattern.

### `redirect`

```typescript
import { stack, redirect } from 'hypr'

export const handler = hypr.stack([
  (ev, ctx) => {
    return redirect(302, '/login')
  },
])
```

### `HttpError`

Create a serializable error i.e. `new HttpError(statusCode[, message, options])`.

```typescript
import { stack, HttpError } from 'hypr'

export const handler = hypr.stack([
  (ev, ctx) => {
    throw new HttpError(400)
  },
])
```

With all options:

```typescript
export const handler = hypr.stack([
  (ev, ctx) => {
    throw new HttpError(400, 'An error occurred', {
      expose: true, // default false for >499 status codes
      headers: {
        'cache-control': 'max-age=0, private',
      },
    })
  },
])
```

### `headers`

An incomplete list of common HTTP headers. Please contribute!

```typescript
import { headers } from 'hypr'

console.log(headers.CacheControl) // cache-control
```

### `methods`

A complete list of HTTP methods.

```typescript
import { methods } from 'hypr'

console.log(methods.POST) // POST
```

### `mimes`

An incomplete list of common mime types. Please contribute!

```typescript
import { mimes } from 'hypr'

console.log(mimes.json) // application/json; charset=utf-8
```

## Available middleware

Hypr ships with a couple of handy middleware.

### CORS

```typescript
import { stack, main } from 'hypr'
import { cors } from 'hypr/cors'

export const handler = stack([
  main(...),
  cors({
    allowedOrigin: 'https://sure-thing.net'
  }),
])
```

### Helmet

Protect your APIs with common security headers. Inspired by
[helmet](https://github.com/helmetjs/helmet).

```typescript
import { stack, main } from 'hypr'
import { helmet } from 'hypr/helmet'

export const handler = stack([
  main(...),
  helmet(),
])
```

## Creating middleware

Middleware run before and/or after any main handlers. Anything running _before_
should attach props to `event` or `context`. Anything running _after_ should read
values from the `response` and merge in new values.

```typescript
import { createHandler } from 'hypr'

export const set204IfNoBodyMiddleware = (options: any) => {
  return createMiddleware((event, context, response) => {
    if (!response.body) {
      response.statusCode = 204
    }
  })
}
```

## License

MIT License © [Sure Thing](https://github.com/sure-thing)
