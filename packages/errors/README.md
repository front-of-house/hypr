# @sstack/errors
Parse and create a valid JSON API spec error response from `Error` instances.
```bash
npm i @sstack/errors --save
```

## Usage
Because this middleware produces a JSON response, you must stringify it after
the error has been handled.
```javascript
const { sstack, main } = require('sstack')
const { stringify } = require('@sstac/json')
const errors = require('@sstack/errors')

exports.handler = sstack([
  main(event => {
    throw new Error('Something went wrong')
  })
], [
  errors(),
  stringify()
])
```

The above will return the following response:
```json
{
  "errors": [
    {
      "status": 500,
      "details": "Something went wrong"
    }
  ]
}
```

To attach more data, do so on the event, following the [JSON API
spec](https://jsonapi.org/format/#errors).

```javascript
exports.handler = sstack([
  main(event => {
    const error = new Error(`Sorry, we couldn't process that.`)
    error.statusCode = 422
    error.title = 'UnprocessableEntity'
    error.code = 'code_for_error'
    throw error
  })
], [
  errors(),
  stringify()
])
```

This will produce the following response:
```json
{
  "errors": [
    {
      "status": 422,
      "title": "UnprocessableEntity",
      "details": "Sorry, we couldn't process that.",
      "code": "code_for_error"
    }
  ]
}
```

To ease this, consider using [http-errors](https://www.npmjs.com/package/http-errors) when throwing errors in your application.

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
