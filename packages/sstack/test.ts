import test from "ava";
import { sstack, main, Context } from "./index";

const event = {
  httpMethod: "GET",
  path: "/",
  headers: {},
  body: "",
  queryStringParameters: {},
  isBase64Encoded: false,
};

const context = {} as Context;

test("works", async (t) => {
  const fn = sstack([
    main(async () => {
      return {
        body: "hello",
      };
    }),
  ]);

  const res = await fn(event, context);

  t.is(res.body, "hello");
});

test("error", async (t) => {
  const fn = sstack([
    main(async () => {
      throw new Error("error");
    }),
  ]);

  const res = await fn(event, context);

  t.is(res.statusCode, 500);
});

test("errorStack", async (t) => {
  const fn = sstack(
    [
      main(async () => {
        throw new Error("error");
      }),
    ],
    [
      async ({ response }) => {
        response.body = "override";
      },
    ]
  );

  const res = await fn(event, context);

  t.is(res.body, "override");
});

test("errorStack with fallback error", async (t) => {
  const fn = sstack(
    [
      main(async () => {
        throw new Error("error");
      }),
    ],
    [
      async () => {
        throw new Error("another error");
      },
    ]
  );

  const res = await fn(event, context);

  t.is(res.body, "500 - Server Error");
});

test("chainable", async (t) => {
  const fn = sstack([
    async (request) => {
      request.response.headers = {
        bar: "true",
      };
    },
    main(async () => {
      return {
        body: "hello",
      };
    }),
    async (request) => {
      request.response.body.foo = false;
    },
  ]);

  const res = await fn(event, context);

  t.is(res.body, "hello");
  t.is(res.headers.bar, "true");
});
