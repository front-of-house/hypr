import tap from 'tap'

import { helmet } from '../helmet'

tap.test(`helmet`, async (t) => {
  const res = helmet()()
  t.ok(res.headers)
})
