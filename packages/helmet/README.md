# @sstack/helmet
Apply basic security headers according to [helmet](https://helmetjs.github.io/).
```bash
npm i @sstack/helmet --save
```

## Usage
```javascript
const { sstack, main } = require('sstack')
const helmet = require('@sstack/helmet')

exports.handler = sstack([
  main(event => { ... }),
  helmet()
])
```

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
