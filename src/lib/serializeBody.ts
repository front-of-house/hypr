import merge from 'deepmerge'
import { Response as LambdaResponse } from 'lambda-types'

import type { HyprResponse } from './types'

import * as httpHeaders from '../headers'
import * as mimes from '../mimes'

const Blobbber = (() => {
  if (typeof Blob !== 'undefined') {
    return Blob
  } else {
    return require('buffer').Blob
  }
})() as typeof Blob

/**
 * Handles body shorthands and sets content type and length headers
 */
export function serializeBody(response: HyprResponse): LambdaResponse {
  const { html = undefined, json = undefined, xml = undefined } = response

  const content = response.body || html || json || xml || undefined
  const body = typeof content === 'object' ? JSON.stringify(content) : content || ''
  const headers: HyprResponse['headers'] = {}
  let contentType = response.headers ? response.headers[httpHeaders.ContentType] : undefined

  if (!contentType) {
    if (!!html) contentType = mimes.html
    else if (!!json) contentType = mimes.json
    else if (!!xml) contentType = mimes.xml
    else contentType = mimes.text
  }

  if (body) {
    headers[httpHeaders.ContentType] = contentType
    headers[httpHeaders.ContentLength] = String(new Blobbber([body]).size)
  }

  // TODO expecting statusCode??
  // @ts-ignore
  return merge(response, { headers, body })
}
