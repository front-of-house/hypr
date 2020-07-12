const assert = require("assert");
const test = require("baretest")("@sstack/cookies");
const { parse, serialize } = require("./dist/sstack.js");

test("parse", () => {
  const parser = parse();
  const request = {
    event: {
      headers: {
        cookie: `a=b; c=${JSON.stringify({ d: "e" })}; f={"g"}`,
      },
    },
    response: {},
  };

  parser(request);

  assert.equal(request.event.cookies.a, "b");
  assert.equal(request.event.cookies.c.d, "e");
  assert.equal(/Cookie/.test(request.event.cookies.f), true);
});

test("serialize", () => {
  const serializer = serialize();
  const request = {
    event: {},
    response: {
      cookies: {
        a: "b",
        c: ["d", { secure: true }],
        e: { f: "g" },
      },
    },
  };

  serializer(request);

  const cookie = request.response.multiValueHeaders["set-cookie"];

  assert.equal(cookie[0], "a=b");
  assert.equal(cookie[1], "c=d; Secure");
  assert.equal(cookie[2], "e=%7B%22f%22%3A%22g%22%7D");
  assert.equal(request.response.cookies, undefined);
});

!(async function () {
  await test.run();
})();
