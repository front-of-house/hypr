import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { normalizeHeaders } from '../normalizeHeaders'

const test = suite('normalizeHeaders')

test('normalizeHeaders', () => {
  const headers = normalizeHeaders({
    'Content-Type': 'a',
    host: 'foo',
  })

  assert.equal(headers, {
    'content-type': 'a',
    host: 'foo',
  })
})

test.run()
