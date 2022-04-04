import * as hypr from '../hypr'

const handler = hypr.stack<{ test: boolean }, { cookies: boolean }>(
  [
    (ev, ctx, res) => {
      const c = ctx.cookies
    },
    // why can't I type this fn separately
    hypr.main({
      get(ev, ctx) {
        return {
          json: {
            foo: true,
          },
          foo: false,
        }
      },
    }),
  ],
  [(ev, ctx, res) => {}]
)
