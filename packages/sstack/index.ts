import { Context as LambdaContext } from "aws-lambda";

export type Context = LambdaContext;

export interface Event {
  isBase64Encoded: boolean;
  httpMethod: string;
  path: string;
  headers: {
    [key: string]: string;
  };
  body: string;
  queryStringParameters: {
    [key: string]: string;
  };
}

export interface Response<Body = any> {
  isBase64Encoded: boolean;
  statusCode: number;
  headers?: {
    [key: string]: string;
  };
  multiValueHeaders?: {
    [key: string]: string[];
  }
  body?: Body;
}

export interface Request {
  event: Event;
  context: Context;
  response: Response;
  error?: any;
}

export type Middleware = (request: Request) => Promise<void>;

export type Handler = (
  event: Event,
  context: Context
) => Promise<Partial<Response>>;

async function apply(request: Request, stack: Middleware[]) {
  let i = 0;

  return (async function run(res) {
    await res;

    const next = stack[++i];

    return next ? run(next(request)) : request;
  })(stack[i] ? stack[i](request) : {});
}

export function main(fn: Handler) {
  return async (request: Request) => {
    const response = await fn(request.event, request.context);
    Object.assign(request.response, response);
  };
}

export function sstack(
  stack: Middleware[] = [],
  errorStack: Middleware[] = []
) {
  // the actual lambda signature
  return async (event: Event, context: Context): Promise<Response<string>> => {
    // normalize all keys to lowercase to match HTTP/2 spec
    for (const key in event.headers) {
      event.headers[key.toLowerCase()] = event.headers[key];
    }

    // normalize event props
    if (!!event.httpMethod) {
      event.queryStringParameters = event.queryStringParameters || {};
    }

    const base: Request = {
      event,
      context,
      response: {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {},
      },
    };

    let handler = Object.assign({}, base);

    try {
      handler = await apply(handler, stack);
      return handler.response;
    } catch (e) {
      handler.error = e;

      // reset response for error w/ defaults to avoid exposure
      handler.response = {
        ...base.response,
        statusCode: 500,
      };

      // handle error stack
      try {
        handler = await apply(handler, errorStack);

        return {
          ...handler.response,
          body: handler.response.body || `500 - Server Error`,
        };
      } catch (e) {
        // catastrophic, reset to defauls to avoid exposure
        return {
          ...base.response,
          statusCode: 500,
          body: `500 - Server Error`,
        };
      }
    }
  };
}
