import { Context as LambdaContext } from "aws-lambda";
import createError from "http-errors";
import deepmerge from 'deepmerge';

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
  };
  body?: Body;
}

export interface Request {
  __meta: {
    handled: boolean;
    methodDefined: boolean;
  };
  event: Event;
  context: Context;
  response: Response;
  error?: any;
}

export type Middleware = (request: Request) => Promise<void> | void;

export type Lambda = (
  event: Event,
  context: Context
) => Promise<Partial<Response>> | Partial<Response>;

async function apply(request: Request, stack: Middleware[]) {
  let i = 0;

  return (async function run(res) {
    await res;

    const next = stack[++i];

    return next ? run(next(request)) : request;
  })(stack[i] ? stack[i](request) : {});
}

export function createMethodHandler(method: string) {
  return (lambda: Lambda): Middleware => {
    return async (request: Request) => {
      request.__meta.methodDefined = true;

      if (request.event.httpMethod === method) {
        if (request.__meta.handled) {
          throw createError(500, `Request was handled twice`);
        } else {
          request.__meta.handled = true;
        }

        request.response = deepmerge(
          request.response,
          await lambda(request.event, request.context)
        );
      }
    };
  };
}

export const GET = createMethodHandler("GET");
export const POST = createMethodHandler("POST");
export const PUT = createMethodHandler("PUT");
export const PATCH = createMethodHandler("PATCH");
export const DELETE = createMethodHandler("DELETE");

export function sstack(stack: Middleware[], errorStack: Middleware[] = []) {
  // the actual lambda signature
  return async (event: Event, context: Context): Promise<Response<string>> => {
    event = Object.assign({}, event)
    context = Object.assign({}, context)

    // normalize all keys to lowercase to match HTTP/2 spec
    for (const key in event.headers) {
      event.headers[key.toLowerCase()] = event.headers[key];
    }

    // normalize event props
    if (!!event.httpMethod) {
      event.queryStringParameters = event.queryStringParameters || {};
    }

    const base: Request = {
      __meta: {
        handled: false,
        methodDefined: false,
      },
      event,
      context,
      response: {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {},
      },
    };

    let res = Object.assign({}, base);

    try {
      res = await apply(res, stack);

      if (!res.__meta.handled) {
        if (res.__meta.methodDefined) {
          throw createError(405);
        }
        throw createError(500, `Request was not handled`);
      }

      return res.response;
    } catch (e) {
      res.error = e;

      // reset response for error w/ defaults to avoid exposure
      res.response = {
        ...base.response,
        statusCode: e.statusCode || 500,
        body: e.message,
      };

      // handle error stack
      try {
        res = await apply(res, errorStack);

        return {
          ...res.response,
          body: res.response.body || `Server error`,
        };
      } catch (e) {
        // catastrophic, reset to defauls to avoid exposure
        return {
          ...base.response,
          statusCode: 500,
          body: `Server error`,
        };
      }
    }
  };
}
