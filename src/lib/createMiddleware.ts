import type { AnyKeyValue, HyprMiddleware } from './types'

export function createMiddleware<E = AnyKeyValue, C = AnyKeyValue>(handler: HyprMiddleware<E, C>) {
  return handler
}
