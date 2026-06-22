export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function issueHref(date) {
  return `issues/${date}.html`;
}

export function issueFileName(date) {
  return `${date}.html`;
}

export function formatDisplayDate(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

export function todayIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
