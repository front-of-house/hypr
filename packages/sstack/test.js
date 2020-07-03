const assert = require("assert");
const test = require("baretest")("sstack");
const { sstack, main } = require("./dist/sstack.js");

const event = {
  httpMethod: "GET",
  path: "/",
  headers: {},
  body: "",
  queryStringParameters: {},
  isBase64Encoded: false,
};

const context = {};

test("works", async (t) => {
  const fn = sstack([
    main(async () => {
      return {
        body: "hello",
      };
    }),
  ]);

  const res = await fn(event, context);

  assert.equal(res.body, "hello");
});

test("error", async (t) => {
  const fn = sstack([
    main(async () => {
      throw new Error("error");
    }),
  ]);

  const res = await fn(event, context);

  assert.equal(res.statusCode, 500);
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

  assert.equal(res.body, "override");
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

  assert.equal(res.body, "500 - Server Error");
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

  assert.equal(res.body, "hello");
  assert.equal(res.headers.bar, "true");
});

!(async function () {
  await test.run();
})();
