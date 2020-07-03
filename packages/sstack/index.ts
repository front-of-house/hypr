import { Context as LambdaContext } from "aws-lambda";
import createError from 'http-errors';

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

type Handler = (
  event: Event,
  context: Context
) => Promise<Partial<Response>> | Partial<Response>;

export type Method = {
  httpMethod: string;
  handler: (
    event: Event,
    context: Context
  ) => Promise<Partial<Response>> | Partial<Response>;
};

async function apply(request: Request, stack: Middleware[]) {
  let i = 0;

  return (async function run(res) {
    await res;

    const next = stack[++i];

    return next ? run(next(request)) : request;
  })(stack[i] ? stack[i](request) : {});
}

export function main(methods: Method[]) {
  return async (request: Request) => {
    const { httpMethod } = request.event;

    let called = false;

    for (const fn of methods) {
      if (httpMethod === fn.httpMethod) {
        const response = await fn.handler(request.event, request.context);
        Object.assign(request.response, response);
        called = true;
        break;
      }
    }

    if (!called) {
      throw createError(405);
    }
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
        statusCode: e.statusCode || 500,
        body: e.message,
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

export function GET(handler: Handler) {
  return {
    httpMethod: 'GET',
    handler,
  };
}

export function PUT(handler: Handler) {
  return {
    httpMethod: 'PUT',
    handler,
  };
}

export function POST(handler: Handler) {
  return {
    httpMethod: 'POST',
    handler,
  };
}

export function PATCH(handler: Handler) {
  return {
    httpMethod: 'PATCH',
    handler,
  };
}

export function DELETE(handler: Handler) {
  return {
    httpMethod: 'DELETE',
    handler,
  };
}
