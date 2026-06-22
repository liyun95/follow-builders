#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { normalizeBriefing, assertPublishableBriefing } from "./lib/briefing.js";
import {
  escapeAttribute,
  escapeHtml,
  formatDisplayDate,
  issueFileName,
  issueHref,
} from "./lib/html.js";

function parseArgs(argv) {
  const args = { docsDir: join("..", "docs") };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[++i];
    else if (arg === "--docs-dir") args.docsDir = argv[++i];
  }
  if (!args.input) throw new Error("--input is required");
  return args;
}

const STYLE = `
:root {
  color-scheme: light;
  --paper: #f8f7f2;
  --paper-deep: #eeeee6;
  --ink: #1d1d1b;
  --muted: #66645d;
  --line: #c9c7bb;
  --line-strong: #363631;
  --accent: #9d3728;
  --accent-blue: #265a7f;
  --accent-green: #3f6f4d;
  --panel: #ffffff;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--paper);
}

body {
  margin: 0;
  background:
    linear-gradient(90deg, rgba(157, 55, 40, 0.05), transparent 22%, transparent 78%, rgba(38, 90, 127, 0.05)),
    var(--paper);
  color: var(--ink);
  font-family: ui-serif, Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", serif;
  line-height: 1.7;
}

a {
  color: var(--accent-blue);
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

a:hover {
  color: var(--accent);
}

.page {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 13px;
}

.topbar a {
  color: inherit;
}

.masthead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: end;
  border-bottom: 4px double var(--line-strong);
  padding: 22px 0 18px;
}

.kicker {
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 8px 0 0;
  font-size: 56px;
  line-height: 1;
  letter-spacing: 0;
}

.date {
  min-width: 154px;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 15px;
  text-align: right;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 286px;
  gap: 34px;
  margin-top: 28px;
}

.editor-note {
  border-left: 5px solid var(--accent);
  background: linear-gradient(90deg, rgba(157, 55, 40, 0.08), rgba(255, 255, 255, 0));
  padding: 12px 0 12px 18px;
  font-size: 18px;
}

.editor-note strong,
.side-panel-title {
  display: block;
  margin-bottom: 4px;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 13px;
  letter-spacing: 0;
  text-transform: uppercase;
}

.side-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 16px;
}

.side-panel + .side-panel {
  margin-top: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 10px;
}

.stat strong {
  display: block;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 25px;
  line-height: 1;
}

.stat span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 12px;
}

.section {
  margin-top: 36px;
  border-top: 2px solid var(--line-strong);
  padding-top: 14px;
}

.section h2 {
  margin: 0 0 8px;
  font-size: 25px;
  line-height: 1.25;
  letter-spacing: 0;
}

.item {
  border-top: 1px solid var(--line);
  padding: 17px 0;
}

.item:first-of-type {
  border-top: 0;
}

.source {
  margin-bottom: 7px;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 14px;
}

.item h3 {
  margin: 0 0 8px;
  font-size: 21px;
  line-height: 1.32;
  letter-spacing: 0;
}

.item p {
  margin: 0;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 11px;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 14px;
}

.links a {
  border: 1px solid var(--line);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.62);
  padding: 4px 8px;
  text-decoration: none;
}

.archive-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.archive-list li {
  border-top: 1px solid var(--line);
  padding: 8px 0;
}

.archive-list li:first-child {
  border-top: 0;
}

.latest-link {
  font-size: 20px;
  font-weight: 700;
}

.footer {
  margin-top: 42px;
  border-top: 1px solid var(--line);
  padding-top: 18px;
  color: var(--muted);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
  font-size: 13px;
}

@media (max-width: 820px) {
  .page {
    width: min(100% - 28px, 680px);
    padding-top: 18px;
  }

  .masthead {
    display: block;
  }

  h1 {
    font-size: 40px;
  }

  .date {
    min-width: 0;
    margin-top: 10px;
    text-align: left;
  }

  .layout {
    display: block;
  }

  .sidebar {
    margin-top: 30px;
  }
}

@media (max-width: 460px) {
  .topbar {
    display: block;
  }

  .topbar div + div {
    margin-top: 4px;
  }

  h1 {
    font-size: 34px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
`;

const STAT_ROWS = [
  ["xBuilders", "builders"],
  ["totalTweets", "tweets"],
  ["blogPosts", "blogs"],
  ["podcastEpisodes", "podcasts"],
];

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23f8f7f2'/%3E%3Cpath d='M14 18h36M14 30h36M14 42h22' stroke='%239d3728' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E";

function renderStats(stats) {
  return STAT_ROWS.map(([key, label]) => {
    return `<div class="stat"><strong>${escapeHtml(stats[key] || 0)}</strong><span>${escapeHtml(label)}</span></div>`;
  }).join("");
}

function renderItem(item, index) {
  const links = item.urls
    .map((url, i) => `<a href="${escapeAttribute(url)}" rel="noopener noreferrer">原文 ${i + 1}</a>`)
    .join("");
  const source = item.role
    ? `${escapeHtml(item.source)} · ${escapeHtml(item.role)}`
    : escapeHtml(item.source);
  const headline = item.headline || item.source || `Item ${index + 1}`;

  return `<article class="item">
    <div class="source">${source}</div>
    <h3>${escapeHtml(headline)}</h3>
    <p>${escapeHtml(item.summary)}</p>
    <div class="links">${links}</div>
  </article>`;
}

function renderArchiveList(archiveDates, hrefForDate) {
  return archiveDates
    .map((date) => {
      return `<li><a href="${escapeAttribute(hrefForDate(date))}">${escapeHtml(formatDisplayDate(date))}</a></li>`;
    })
    .join("");
}

function renderSections(sections) {
  return sections
    .map((section) => {
      return `<section class="section">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.items.map(renderItem).join("\n")}
    </section>`;
    })
    .join("\n");
}

function renderIssue(briefing, archiveDates) {
  const archive = renderArchiveList(archiveDates, issueFileName);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(briefing.title)} · ${escapeHtml(formatDisplayDate(briefing.date))}</title>
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
  <main class="page">
    <nav class="topbar" aria-label="Site">
      <div><a href="../index.html">AI Builders 简报</a></div>
      <div>Follow builders, not influencers.</div>
    </nav>
    <header class="masthead">
      <div>
        <div class="kicker">AI News Briefing</div>
        <h1>${escapeHtml(briefing.title)}</h1>
      </div>
      <div class="date">${escapeHtml(formatDisplayDate(briefing.date))}</div>
    </header>
    <div class="layout">
      <article>
        <section class="editor-note">
          <strong>编辑手记</strong>
          ${escapeHtml(briefing.editorNote)}
        </section>
        ${renderSections(briefing.sections)}
      </article>
      <aside class="sidebar">
        <section class="side-panel">
          <div class="side-panel-title">今日统计</div>
          <div class="stats-grid">${renderStats(briefing.stats)}</div>
        </section>
        <section class="side-panel">
          <div class="side-panel-title">往期简报</div>
          <ul class="archive-list">${archive}</ul>
        </section>
      </aside>
    </div>
    <footer class="footer">Generated through the Follow Builders skill: https://github.com/zarazhangrui/follow-builders</footer>
  </main>
</body>
</html>`;
}

function renderIndex(latest, archiveDates) {
  const archive = renderArchiveList(archiveDates, issueHref);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Builders 简报</title>
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <main class="page">
    <header class="masthead">
      <div>
        <div class="kicker">AI News Briefing</div>
        <h1>AI Builders 简报</h1>
      </div>
      <div class="date">公开归档</div>
    </header>
    <div class="layout">
      <article>
        <section class="editor-note">
          <strong>今日简报</strong>
          每日追踪 AI builder、官方博客和播客里的高信号内容。
        </section>
        <section class="section">
          <h2>最新一期</h2>
          <p class="latest-link"><a href="${escapeAttribute(issueHref(latest.date))}">${escapeHtml(formatDisplayDate(latest.date))} · ${escapeHtml(latest.title)}</a></p>
          <p>${escapeHtml(latest.editorNote)}</p>
        </section>
      </article>
      <aside class="sidebar">
        <section class="side-panel">
          <div class="side-panel-title">往期简报</div>
          <ul class="archive-list">${archive}</ul>
        </section>
      </aside>
    </div>
  </main>
</body>
</html>`;
}

async function listIssueDates(docsDir, currentDate) {
  const issuesDir = join(docsDir, "issues");
  let files = [];
  try {
    files = await readdir(issuesDir);
  } catch {
    return [currentDate];
  }

  const dates = files
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.html$/.test(file))
    .map((file) => file.replace(/\.html$/, ""));
  if (!dates.includes(currentDate)) dates.push(currentDate);
  return dates.sort().reverse();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const briefing = normalizeBriefing(JSON.parse(await readFile(args.input, "utf8")));
  assertPublishableBriefing(briefing);

  const archiveDates = await listIssueDates(args.docsDir, briefing.date);
  const issuePath = join(args.docsDir, "issues", issueFileName(briefing.date));
  const indexPath = join(args.docsDir, "index.html");
  const stylePath = join(args.docsDir, "assets", "style.css");

  await mkdir(dirname(issuePath), { recursive: true });
  await mkdir(dirname(stylePath), { recursive: true });
  await writeFile(stylePath, `${STYLE.trim()}\n`);
  await writeFile(issuePath, `${renderIssue(briefing, archiveDates)}\n`);
  await writeFile(indexPath, `${renderIndex(briefing, archiveDates)}\n`);

  console.log(JSON.stringify({ status: "ok", issue: issuePath, index: indexPath }));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
