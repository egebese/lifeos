import { after, test } from "node:test";
import assert from "node:assert/strict";
import { buildAuthorizeUrl } from "./oauth.js";

const testEnv = process.env as Record<string, string | undefined>;
const originalClientId = testEnv.WHOOP_CLIENT_ID;
const originalRedirectUri = testEnv.WHOOP_REDIRECT_URI;
const originalAppUrl = testEnv.NEXT_PUBLIC_APP_URL;

after(() => {
  for (const [name, value] of [
    ["WHOOP_CLIENT_ID", originalClientId],
    ["WHOOP_REDIRECT_URI", originalRedirectUri],
    ["NEXT_PUBLIC_APP_URL", originalAppUrl],
  ] as const) {
    if (value === undefined) delete testEnv[name];
    else testEnv[name] = value;
  }
});

test("derives the callback from the public app URL when no explicit URI is set", () => {
  testEnv.WHOOP_CLIENT_ID = "client-id";
  delete testEnv.WHOOP_REDIRECT_URI;
  testEnv.NEXT_PUBLIC_APP_URL = "https://lifeos.example.test/";

  const url = new URL(buildAuthorizeUrl("state"));

  assert.equal(url.searchParams.get("redirect_uri"), "https://lifeos.example.test/api/whoop/callback");
});
