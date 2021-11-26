import * as hypr from 'hypr'
import { helmet } from 'hypr/helmet'

export const route = '*'

export const handler = hypr.stack([
  hypr.main({
    get(ev) {
      return {
        json: {
          hello: 'hello',
        },
      }
    },
  }),
])
