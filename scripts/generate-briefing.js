#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { pathToFileURL } from "url";
import { normalizeBriefing, assertPublishableBriefing } from "./lib/briefing.js";
import { todayIsoDate } from "./lib/html.js";

export const MAX_BLOG_AGE_DAYS = 5;

function parseArgs(argv) {
  const args = { date: todayIsoDate() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[++i];
    else if (arg === "--output") args.output = argv[++i];
    else if (arg === "--date") args.date = argv[++i];
  }
  if (!args.input) throw new Error("--input is required");
  if (!args.output) args.output = join("..", "docs", "data", `${args.date}.json`);
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parsePublishedAt(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const hasTime = /T|\d{1,2}:\d{2}/.test(raw);
  const parsed = new Date(hasTimezone || hasTime ? raw : `${raw} UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function isRecentBlogPost(blog, date, maxAgeDays = MAX_BLOG_AGE_DAYS) {
  const publishedAt = parsePublishedAt(blog?.publishedAt);
  if (!publishedAt) return false;

  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - maxAgeDays);
  const end = new Date(`${date}T23:59:59.999Z`);

  return publishedAt >= start && publishedAt <= end;
}

export function compactPreparedData(prepared, date) {
  const blogs = (prepared.blogs || [])
    .filter((blog) => isRecentBlogPost(blog, date))
    .map((blog) => ({
      name: blog.name,
      title: blog.title,
      url: blog.url,
      publishedAt: blog.publishedAt,
      author: blog.author,
      description: blog.description,
      content: String(blog.content || "").slice(0, 8000),
    }));

  return {
    date,
    stats: {
      ...(prepared.stats || {}),
      blogPosts: blogs.length,
    },
    x: (prepared.x || []).map((account) => ({
      name: account.name,
      handle: account.handle,
      bio: account.bio,
      tweets: (account.tweets || []).map((tweet) => ({
        text: tweet.text,
        url: tweet.url,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        createdAt: tweet.createdAt,
        isQuote: tweet.isQuote,
      })),
    })),
    blogs,
    podcasts: (prepared.podcasts || []).map((podcast) => ({
      name: podcast.name,
      title: podcast.title,
      url: podcast.url,
      publishedAt: podcast.publishedAt,
      transcript: String(podcast.transcript || "").slice(0, 12000),
    })),
  };
}

function buildPrompt(prepared, date) {
  const compact = compactPreparedData(prepared, date);
  return [
    "你是 AI Builders 简报的中文编辑。",
    "只能使用下面 JSON 中的内容，不要浏览网页，不要编造事实。",
    "输出必须是一个 JSON object，不要 Markdown，不要代码围栏。",
    "默认语言是自然简体中文，但保留 builder、AI、LLM、agent、API、prompt、token、RAG 等英文术语。",
    "人名、公司名、产品名、来源标题和 URL 保持原文。",
    "跳过低信号社交内容。每个 item 必须至少包含一个原始 URL。",
    "JSON schema:",
    JSON.stringify({
      date: "YYYY-MM-DD",
      title: "AI Builders 简报",
      editorNote: "中文编辑手记，80-160 字",
      stats: {
        xBuilders: 0,
        totalTweets: 0,
        blogPosts: 0,
        podcastEpisodes: 0,
      },
      sections: [
        {
          id: "x",
          title: "Builder 动态",
          items: [
            {
              source: "Name",
              role: "Role or company if known",
              headline: "中文标题",
              summary: "中文摘要，保留必要英文术语",
              urls: ["https://example.com"],
            },
          ],
        },
      ],
    }),
    "Required section ids and titles when content exists:",
    "x => Builder 动态",
    "blogs => 官方博客",
    "podcasts => 播客精选",
    "Prepared feed JSON:",
    JSON.stringify(compact),
  ].join("\n\n");
}

function extractJsonTextFromResponses(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

async function callResponsesApi({ baseUrl, apiKey, model, prompt }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: { format: { type: "json_object" } },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`LLM API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return extractJsonTextFromResponses(data);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prepared = JSON.parse(await readFile(args.input, "utf8"));
  const prompt = buildPrompt(prepared, args.date);

  const rawText = await callResponsesApi({
    baseUrl: requireEnv("OPENAI_BASE_URL"),
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    prompt,
  });

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`LLM returned invalid JSON: ${err.message}\n${rawText}`);
  }

  const briefing = normalizeBriefing({
    ...parsed,
    date: parsed.date || args.date,
    stats: parsed.stats || prepared.stats || {},
  });
  assertPublishableBriefing(briefing);

  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, JSON.stringify(briefing, null, 2));
  console.log(JSON.stringify({ status: "ok", output: args.output }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
