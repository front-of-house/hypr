import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { helmet } from '../helmet'
import { HyprEvent, HyprContext } from '../hypr'
import { normalizeResponse } from '../lib/normalizeResponse'

const test = suite('helmet')

test(`helmet`, () => {
  const response = normalizeResponse({})
  helmet()({} as HyprEvent, {} as HyprContext, response)
  assert.ok(response.headers)
})

test.run()
