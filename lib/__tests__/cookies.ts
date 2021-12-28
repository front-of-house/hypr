import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { stack, Event, Context } from '../hypr'
import { thaw, bake, parse, serialize } from '../cookies'

const test = suite('cookies')

test('thaw', async () => {
  const event = {
    headers: {
      cookie: 'foo=bar; json={"id":1}; invalid={"id:1}',
    },
  } as unknown as Event

  thaw()(event, {} as Context)

  assert.equal(event.cookies.foo, 'bar')
  assert.equal(event.cookies.json, { id: 1 })
  assert.equal(event.cookies.invalid, '{"id:1}')
})

test('bake', async () => {
  const res = await bake()({} as unknown as Event, {} as Context, {
    cookies: {
      foo: [
        'bar',
        {
          secure: true,
        },
      ],
      basic: 'bar',
      json: [
        { id: 1 },
        {
          secure: true,
        },
      ],
    },
  })

  if (res) {
    assert.equal(res.multiValueHeaders['set-cookie'], ['foo=bar; Secure', 'basic=bar', 'json={"id":1}; Secure'])
  } else {
    throw 'fail'
  }
})

test('aliases', () => {
  assert.ok(parse)
  assert.ok(serialize)
})

test('e2e', async () => {
  let plan = 0

  const event = {
    headers: {
      cookie: 'foo=bar',
    },
  } as unknown as Event
  const context = {} as Context
  const res = await stack([
    thaw(),
    (event) => {
      assert.equal(event.cookies.foo, 'bar')
      plan++
      return {
        cookies: {
          baz: [
            'qux',
            {
              secure: true,
            },
          ],
        },
      }
    },
    bake(),
  ])(event, context)

  assert.equal(plan, 1)
  assert.equal(res.multiValueHeaders['set-cookie'], ['baz=qux; Secure'])
})

test.run()
