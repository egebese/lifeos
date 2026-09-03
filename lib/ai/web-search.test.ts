import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { parseSearchResults, searchWeb } from "./web-search.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const fixture = `
  <a href="https://not-a-result.example/">Ignore this link</a>
  <div class="result results_links">
    <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fone&amp;rut=1">First &amp; Best</a></h2>
    <a class="result__snippet">A <b>useful</b> snippet.</a>
  </div>
  <div class="result results_links">
    <h2><a class="result__a" href="https://example.com/two">Second Result</a></h2>
    <a class="result__snippet">Second snippet.</a>
  </div>
  <a class="result__a" href="javascript:alert(1)">Reject script</a>
`;

test("parseSearchResults extracts only safe result links and text", () => {
  assert.deepEqual(parseSearchResults(fixture), [
    { title: "First & Best", snippet: "A useful snippet.", url: "https://example.com/one" },
    { title: "Second Result", snippet: "Second snippet.", url: "https://example.com/two" },
  ]);
});

test("searchWeb bounds the query and result context", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      Array.from({ length: 8 }, (_, i) => `
        <div class="result results_links">
          <h2><a class="result__a" href="https://example.com/${i}">Result ${i}</a></h2>
          <a class="result__snippet">${"x".repeat(1500)}</a>
        </div>`).join(""),
      { status: 200 },
    );
  };

  const out = await searchWeb("q".repeat(300));

  assert.equal(new URL(requestedUrl).searchParams.get("q")?.length, 240);
  assert.equal(out.used, true);
  assert.match(out.context, /UNTRUSTED WEB SEARCH REFERENCES/);
  assert.ok(out.context.length <= 6000);
  assert.equal((out.context.match(/Result \d/g) ?? []).length <= 5, true);
});

test("searchWeb returns an unused result for empty, malformed, and failed searches", async () => {
  assert.deepEqual(await searchWeb("   "), { context: "", used: false });

  globalThis.fetch = async () => new Response("<html><body>no results</body></html>", { status: 200 });
  assert.deepEqual(await searchWeb("meal"), { context: "", used: false });

  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  assert.deepEqual(await searchWeb("meal"), { context: "", used: false });
});
