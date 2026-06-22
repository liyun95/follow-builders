import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  escapeAttribute,
  isHttpUrl,
  issueHref,
  formatDisplayDate,
} from "../lib/html.js";

test("escapeHtml escapes text content", () => {
  assert.equal(
    escapeHtml("<script>alert('x')</script> & text"),
    "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; text",
  );
});

test("escapeAttribute escapes quoted attribute content", () => {
  assert.equal(
    escapeAttribute("\" onclick=\"alert(1)"),
    "&quot; onclick=&quot;alert(1)",
  );
});

test("isHttpUrl accepts only http and https URLs", () => {
  assert.equal(isHttpUrl("https://x.com/levie/status/1"), true);
  assert.equal(isHttpUrl("http://example.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("mailto:test@example.com"), false);
  assert.equal(isHttpUrl("not a url"), false);
});

test("issueHref returns GitHub Pages relative issue path", () => {
  assert.equal(issueHref("2026-06-22"), "issues/2026-06-22.html");
});

test("formatDisplayDate renders Chinese date text", () => {
  assert.equal(formatDisplayDate("2026-06-22"), "2026年6月22日");
});
