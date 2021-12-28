import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { helmet } from '../helmet'

const test = suite('helmet')

test(`helmet`, () => {
  const res = helmet()()
  assert.ok(res.headers)
})

test.run()
