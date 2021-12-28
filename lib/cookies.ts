import * as sugarcookie from 'sugarcookie'

import { createHandler } from './hypr'

export const parse = createHandler(() => {
  return function handler(event) {
    event.cookies = {}

    if (event.headers.cookie) {
      event.cookies = sugarcookie.thaw(event.headers.cookie)

      for (const key of Object.keys(event.cookies)) {
        if (/^\{/.test(event.cookies[key])) {
          try {
            event.cookies[key] = JSON.parse(event.cookies[key])
          } catch (e) {
            event.cookies[key] = event.cookies[key]
          }
        }
      }
    }
  }
})

export const serialize = createHandler(() => {
  return function handler(e, c, response = {}) {
    const { cookies = {} } = response

    const serialized = Object.keys(cookies)
      .filter((key) => !cookies[key].__hypr__) // ignore parsed JSON or primitives
      .map((key) => {
        const [value, options = {}] = [].concat(cookies[key])
        return sugarcookie.bake(key, typeof value === 'object' ? JSON.stringify(value) : value, options)
      })

    return {
      multiValueHeaders: { 'set-cookie': serialized },
    }
  }
})

export const thaw = parse
export const bake = serialize
