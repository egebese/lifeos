import { after, test } from "node:test";
import assert from "node:assert/strict";
import { secureCookies } from "./session.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalSecure = process.env.SESSION_COOKIE_SECURE;
const testEnv = process.env as Record<string, string | undefined>;

after(() => {
  if (originalNodeEnv === undefined) delete testEnv.NODE_ENV;
  else testEnv.NODE_ENV = originalNodeEnv;
  if (originalSecure === undefined) delete testEnv.SESSION_COOKIE_SECURE;
  else testEnv.SESSION_COOKIE_SECURE = originalSecure;
});

test("production cookies stay secure even when the override is false", () => {
  testEnv.NODE_ENV = "production";
  testEnv.SESSION_COOKIE_SECURE = "false";
  assert.equal(secureCookies(), true);
});

test("development can opt into secure cookies", () => {
  testEnv.NODE_ENV = "development";
  testEnv.SESSION_COOKIE_SECURE = "true";
  assert.equal(secureCookies(), true);
  testEnv.SESSION_COOKIE_SECURE = "false";
  assert.equal(secureCookies(), false);
});
