const assert = require("assert");
const test = require("baretest")("sstack");
const { sstack, GET, POST } = require("./dist/sstack.js");

const event = {
  httpMethod: "GET",
  path: "/",
  headers: {},
  body: "",
  queryStringParameters: {},
  isBase64Encoded: false,
};

const context = {};

test("works", async () => {
  const fn = sstack([
    GET(async () => {
      return {
        body: "hello",
      };
    }),
  ]);

  const res = await fn(event, context);

  assert.equal(res.body, "hello");
});

test("unhandled", async () => {
  const fn = sstack([
    () => {}
  ]);

  const res = await fn(event, context);

  assert.equal(res.statusCode, 500);
});

test("error", async () => {
  const fn = sstack([
    GET(async () => {
      throw new Error("error");
    }),
  ]);

  const res = await fn(event, context);

  assert.equal(res.statusCode, 500);
});

test("errorStack", async () => {
  const fn = sstack(
    [
      GET(async () => {
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

  assert.equal(res.body, "override");
});

test("errorStack with fallback error", async () => {
  const fn = sstack(
    [
      GET(async () => {
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

  assert.equal(res.statusCode, 500);
});

test("chainable", async () => {
  const fn = sstack([
    async (request) => {
      request.response.headers = {
        bar: "true",
      };
    },
    GET(async () => {
      return {
        body: "hello",
      };
    }),
    async (request) => {
      request.response.body.foo = false;
    },
  ]);

  const res = await fn(event, context);

  assert.equal(res.body, "hello");
  assert.equal(res.headers.bar, "true");
});

test("method not allowed", async () => {
  const fn = sstack([
    POST(async () => {
      return {
        body: "hello",
      };
    }),
  ]);

  const res = await fn(event, context);

  assert.equal(res.statusCode, 405);
  assert.equal(res.body, "Method Not Allowed");
});

!(async function () {
  await test.run();
})();
