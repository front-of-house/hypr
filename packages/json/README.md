# @sstack/json
Easy JSON body parsing and request stringifying.
```bash
npm i @sstack/json --save
```

## Usage
```javascript
const { sstack, main } = require('sstack')
const { parse, stringify } = require('@sstack/json')

exports.handler = sstack([
  parse(),
  main(event => {
    console.log(typeof event.body) // 'object'
  }),
  stringify()
])
```

You may also want to implement this for errors as well, if you plan to return
JSON responses when throwing them.
```javascript
const { sstack, main } = require('sstack')
const { parse, stringify } = require('@sstack/json')
const errors = require('./my-custom-errors.js')

exports.handler = sstack([
  parse(),
  main(event => {
    console.log(typeof event.body) // 'object'
  }),
  stringify()
], [
  errors(),
  stringify()
])
```

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
