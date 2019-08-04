# @sstack/cookies
Parse and attach cookies to the function `event` object.
```bash
npm i @sstack/cookies --save
```

## Usage
```javascript
const { sstack, main } = require('sstack')
const cookies = require('@sstack/cookies')

exports.handler = sstack([
  cookies(),
  main(event => {
    console.log(event.cookies) // { ... }
  })
])
```

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
