import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBriefing } from "../lib/briefing.js";

test("normalizeBriefing keeps only items with http URLs", () => {
  const briefing = normalizeBriefing({
    date: "2026-06-22",
    title: "AI Builders 简报",
    editorNote: "今日重点。",
    stats: { xBuilders: 1, totalTweets: 2, blogPosts: 0, podcastEpisodes: 0 },
    sections: [
      {
        id: "x",
        title: "Builder 动态",
        items: [
          {
            source: "Aaron Levie",
            headline: "Open weights matter",
            summary: "有效内容。",
            urls: ["https://x.com/levie/status/1", "javascript:alert(1)"],
          },
          {
            source: "No Link",
            headline: "No URL",
            summary: "应该被移除。",
            urls: [],
          },
        ],
      },
    ],
  });

  assert.equal(briefing.sections[0].items.length, 1);
  assert.deepEqual(briefing.sections[0].items[0].urls, [
    "https://x.com/levie/status/1",
  ]);
});

test("normalizeBriefing supplies stable Chinese section defaults", () => {
  const briefing = normalizeBriefing({
    date: "2026-06-22",
    stats: {},
    sections: [],
  });

  assert.equal(briefing.title, "AI Builders 简报");
  assert.equal(briefing.editorNote, "");
  assert.deepEqual(briefing.sections, []);
});
