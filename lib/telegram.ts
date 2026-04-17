export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping notification");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  // Telegram message limit is 4096 chars; split if needed
  const chunks = splitMessage(text, 4000);
  for (const chunk of chunks) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Telegram] Failed to send:", err);
    }
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    const cutAt = remaining.lastIndexOf("\n", maxLen) || maxLen;
    parts.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt + 1);
  }
  if (remaining) parts.push(remaining);
  return parts;
}
