import { isHttpUrl } from "./html.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function cleanUrls(urls) {
  return asArray(urls).map(cleanString).filter(isHttpUrl);
}

export function normalizeBriefing(input) {
  const sections = asArray(input?.sections)
    .map((section) => {
      const items = asArray(section.items)
        .map((item) => ({
          source: cleanString(item.source),
          role: cleanString(item.role),
          headline: cleanString(item.headline),
          summary: cleanString(item.summary),
          urls: cleanUrls(item.urls),
        }))
        .filter((item) => item.urls.length > 0);

      return {
        id: cleanString(section.id),
        title: cleanString(section.title),
        items,
      };
    })
    .filter((section) => section.items.length > 0);

  return {
    date: cleanString(input?.date),
    title: cleanString(input?.title) || "AI Builders 简报",
    editorNote: cleanString(input?.editorNote),
    stats: {
      xBuilders: Number(input?.stats?.xBuilders || 0),
      totalTweets: Number(input?.stats?.totalTweets || 0),
      blogPosts: Number(input?.stats?.blogPosts || 0),
      podcastEpisodes: Number(input?.stats?.podcastEpisodes || 0),
    },
    sections,
  };
}

export function assertPublishableBriefing(briefing) {
  if (!briefing.date) throw new Error("Briefing date is required");
  if (!briefing.sections.length) {
    throw new Error("Briefing has no publishable sections");
  }
}
