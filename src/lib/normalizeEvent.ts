import type { AnyKeyValue, HyprEvent } from './types'
import { normalizeHeaders } from './normalizeHeaders'
import { ContentType } from '../headers'

export function normalizeEvent<E = AnyKeyValue>(event: HyprEvent<E>): HyprEvent<E> {
  const headers = normalizeHeaders<HyprEvent['headers']>(event.headers)
  const multiValueHeaders = normalizeHeaders<HyprEvent['multiValueHeaders']>(event.multiValueHeaders)

  const ev = {
    ...event,
    headers,
    multiValueHeaders,
  }

  const type = ev.headers[ContentType] || ''

  if (ev.body && type.includes('json')) {
    try {
      ev.json = JSON.parse(ev.body)
    } catch (e) {}
  }

  return ev
}
