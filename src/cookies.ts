import merge from 'deepmerge'
import * as sugarcookie from 'sugarcookie'

import * as headers from './headers'
import { createMiddleware } from './lib/createMiddleware'

export function parse() {
  return createMiddleware((ev, ctx, res) => {
    ev.cookies = {}

    if (ev.headers.cookie) {
      ev.cookies = sugarcookie.thaw(ev.headers.cookie)

      for (const key of Object.keys(ev.cookies)) {
        if (/^\{/.test(ev.cookies[key])) {
          try {
            ev.cookies[key] = JSON.parse(ev.cookies[key])
          } catch (e) {}
        }
      }
    }
  })
}

export function serialize() {
  return createMiddleware((ev, ctx, res) => {
    const { cookies = {} } = res

    const serialized = Object.keys(cookies).map((key) => {
      const cookie = cookies[key]
      const [value, options = {}] = Array.isArray(cookie) ? cookie : [cookie, {}]
      return sugarcookie.bake(key, typeof value === 'object' ? JSON.stringify(value) : value, options)
    })

    Object.assign(
      res,
      merge(res, {
        multiValueHeaders: { [headers.SetCookie]: serialized },
      })
    )

    delete res.cookies
  })
}

export const thaw = parse
export const bake = serialize
