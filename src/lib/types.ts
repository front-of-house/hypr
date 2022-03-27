import * as sugarcookie from 'sugarcookie'
import {
  Event as LambdaEvent,
  Context as LambdaContext,
  Response as LambdaResponse,
  Params,
  MultiValueParams,
} from 'lambda-types'

import type { HttpError } from '../hypr'

export type AnyKeyValue = Record<string, any>
export type Unsync<T> = T | Promise<T>
export type BodyShorthands = {
  html?: string
  json?: object
  xml?: string
}

export type HyprEvent<E = AnyKeyValue> = LambdaEvent & { json?: AnyKeyValue } & E
export type HyprContext<C = AnyKeyValue> = LambdaContext & { error?: HttpError | Error } & C
export type HyprResponse = LambdaResponse &
  BodyShorthands &
  AnyKeyValue & {
    headers: Params
    multiValueHeaders: MultiValueParams
  } & {
    cookies?: {
      [name: string]: string | AnyKeyValue | [string | AnyKeyValue, sugarcookie.Options]
    }
  }

export type HyprMiddleware<E = AnyKeyValue, C = AnyKeyValue> = (
  event: HyprEvent<E>,
  context: HyprContext<C>,
  response: HyprResponse
) => Unsync<Partial<HyprResponse> | void>

export type HyprHandler<E = AnyKeyValue, C = AnyKeyValue> = (
  event: HyprEvent<E>,
  context: HyprContext<C>
) => Unsync<Partial<HyprResponse>>
