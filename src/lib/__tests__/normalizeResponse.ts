import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { normalizeResponse } from '../normalizeResponse'

const test = suite('normalizeResponse')

test('normalizeResponse', () => {
  const response = normalizeResponse({
    headers: {
      Host: 'foo',
    },
    multiValueHeaders: {
      'Set-Cookie': [],
    },
  })

  assert.equal(response, {
    isBase64Encoded: false,
    statusCode: 200,
    body: undefined,
    headers: {
      host: 'foo',
    },
    multiValueHeaders: {
      'set-cookie': [],
    },
  })
})

test.run()
