import * as cookie from "cookie";
import { Middleware } from "sstack";

declare module "sstack" {
  interface Event {
    cookies: {
      [key: string]: any;
    };
  }

  interface Response {
    cookies: {
      [key: string]:
        | string
        | [
            string,
            cookie.CookieSerializeOptions
          ];
    };
  }
}

export function parse(options = {}): Middleware {
  return async ({ event, response }) => {
    event.cookies = {};
    response.cookies = {};

    if (event.headers.cookie) {
      event.cookies = cookie.parse(event.headers.cookie);

      for (const key of Object.keys(event.cookies)) {
        if (/^\{/.test(event.cookies[key])) {
          try {
            event.cookies[key] = JSON.parse(event.cookies[key]);
          } catch (e) {
            event.cookies[
              key
            ] = `Cookie appeared to contain JSON, but content was malformed.`;
          }
        }
      }
    }
  };
}

export function serialize(options = {}): Middleware {
  return async (request) => {
    const { cookies = {} } = request.response;

    request.response.multiValueHeaders = {
      ...(request.response.multiValueHeaders || {}),
      "set-cookie": Object.keys(cookies).map((key) => {
        const [value, options = {}] = [].concat(cookies[key]);
        return cookie.serialize(
          key,
          typeof value === "object" ? JSON.stringify(value) : value,
          options
        );
      }),
    };

    delete request.response.cookies;
  };
}
