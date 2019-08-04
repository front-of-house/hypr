# @sstack/validate
Request & response schema validation using [ajv](https://github.com/epoberezkin/ajv).
```bash
npm i @sstack/validate --save
```

## Usage
You'll want to use this library in conjunction with `@sstack/json`, since
`@sstack/validate` assumes the body will be parsed and stringified.

```javascript
const { sstack, main } = require('sstack')
const { parse, stringify } = require('@sstack/json')
const validate = require('@sstack/validate')

exports.handler = sstack([
  parse(),
  validate.request({
    type: 'object',
    properties: {
      email: {
        type: 'string'
      },
      password: {
        type: 'string'
      }
    },
    required: [
      'email',
      'password'
    ]
  }),
  main(event => {
    const { email, password } = event.body
    const user = logIn(email, password)

    return {
      body: {
        name: user.name
      }
    }
  }),
  validate.response({
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          }
        }
      }
    }
  }),
  stringify()
])
```

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
