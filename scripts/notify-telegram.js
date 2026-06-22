#!/usr/bin/env node

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[++i];
    else if (arg === "--date") args.date = argv[++i];
  }
  if (!args.url) throw new Error("--url is required");
  if (!args.date) throw new Error("--date is required");
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requireEnv("TELEGRAM_CHAT_ID");
  const text = `今日 AI Builders 简报已更新：\n${args.url}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Telegram API error ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log(JSON.stringify({ status: "ok", method: "telegram" }));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
