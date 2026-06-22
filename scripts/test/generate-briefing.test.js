import test from "node:test";
import assert from "node:assert/strict";
import {
  compactPreparedData,
  isRecentBlogPost,
} from "../generate-briefing.js";

test("isRecentBlogPost keeps posts published within five days of issue date", () => {
  assert.equal(
    isRecentBlogPost({ publishedAt: "June 18, 2026" }, "2026-06-22"),
    true,
  );
  assert.equal(
    isRecentBlogPost({ publishedAt: "2026-06-17T00:00:00.000Z" }, "2026-06-22"),
    true,
  );
});

test("isRecentBlogPost rejects stale or undated posts", () => {
  assert.equal(
    isRecentBlogPost({ publishedAt: "May 19, 2026" }, "2026-06-22"),
    false,
  );
  assert.equal(
    isRecentBlogPost({ publishedAt: null }, "2026-06-22"),
    false,
  );
  assert.equal(
    isRecentBlogPost({ publishedAt: "not a date" }, "2026-06-22"),
    false,
  );
});

test("compactPreparedData passes only recent blogs to the LLM prompt", () => {
  const compact = compactPreparedData(
    {
      stats: { blogPosts: 3 },
      blogs: [
        {
          name: "Claude Blog",
          title: "Recent",
          url: "https://claude.com/blog/recent",
          publishedAt: "June 18, 2026",
          content: "recent content",
        },
        {
          name: "Claude Blog",
          title: "Old",
          url: "https://claude.com/blog/old",
          publishedAt: "May 19, 2026",
          content: "old content",
        },
        {
          name: "Anthropic Engineering",
          title: "Undated",
          url: "https://www.anthropic.com/engineering/undated",
          publishedAt: null,
          content: "undated content",
        },
      ],
    },
    "2026-06-22",
  );

  assert.equal(compact.stats.blogPosts, 1);
  assert.deepEqual(
    compact.blogs.map((blog) => blog.title),
    ["Recent"],
  );
});
