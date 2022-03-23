import type { HyprResponse } from './types'
import { normalizeHeaders } from './normalizeHeaders'

export function normalizeResponse(response: Partial<HyprResponse>): HyprResponse {
  const headers = normalizeHeaders<HyprResponse['headers']>(response.headers || {})
  const multiValueHeaders = normalizeHeaders<HyprResponse['multiValueHeaders']>(response.multiValueHeaders || {})

  return {
    isBase64Encoded: false,
    statusCode: 200,
    body: undefined,
    ...response,
    headers,
    multiValueHeaders,
  }
}
