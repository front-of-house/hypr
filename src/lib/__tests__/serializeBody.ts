import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { normalizeResponse } from '../normalizeResponse'
import { serializeBody } from '../serializeBody'

const test = suite('serializeBody')

test('serializeBody - html', async () => {
  const res = serializeBody(
    normalizeResponse({
      html: 'body',
    })
  )
  assert.ok(res.headers && String(res.headers['content-type']).includes('text/html'))
  assert.equal(res.body, 'body')
})

test('serializeBody - json', async () => {
  const json = { foo: true }
  const res = serializeBody(normalizeResponse({ json }))
  assert.ok(res.headers && String(res.headers['content-type']).includes('application/json'))
  assert.equal(res.body, JSON.stringify(json))
})

test('serializeBody - xml', async () => {
  const xml = '</>'
  const res = serializeBody(normalizeResponse({ xml }))
  assert.ok(res.headers && String(res.headers['content-type']).includes('application/xml'))
  assert.equal(res.body, xml)
})

test('serializeBody - statusCode', async () => {
  const res = serializeBody(normalizeResponse({ statusCode: 400 }))
  assert.equal(res.statusCode, 400)
})

test('serializeBody - headers', async () => {
  const res = serializeBody(normalizeResponse({ headers: { Host: 'foo' } }))
  assert.ok(res.headers && res.headers.host === 'foo')
})

test('serializeBody - multiValueHeaders', async () => {
  const res = serializeBody(
    normalizeResponse({
      multiValueHeaders: { 'set-cookie': ['foo', 'bar'] },
    })
  )
  assert.ok(res.multiValueHeaders && res.multiValueHeaders['set-cookie'][0] === 'foo')
})

test('serializeBody - existing content-type', async () => {
  const res = serializeBody(
    normalizeResponse({
      headers: {
        'content-type': 'text/plain',
      },
      json: { auth: true },
    })
  )
  assert.equal(res?.headers?.['content-type'], 'text/plain')
})

test('serializeBody - content-length', async () => {
  const res = serializeBody(
    normalizeResponse({
      body: '20€',
    })
  )
  assert.equal(res?.headers?.['content-length'], '5')
})

test.run()
