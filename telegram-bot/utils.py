from telegram import Update, Message

MAX_LEN = 4000


async def safe_send(update: Update, text: str) -> None:
    """Send a message, splitting if over Telegram's limit. Tries Markdown first."""
    msg: Message = update.message or (
        update.callback_query.message if update.callback_query else None
    )
    if not msg:
        return
    await _send_chunks(msg.reply_text, text)


async def safe_send_to(bot, chat_id: int, text: str) -> None:
    """Send from a bot object (e.g. scheduled jobs)."""
    await _send_chunks(
        lambda t, **kw: bot.send_message(chat_id=chat_id, text=t, **kw), text
    )


async def _send_chunks(send_fn, text: str) -> None:
    chunks = [text[i:i + MAX_LEN] for i in range(0, len(text), MAX_LEN)]
    for chunk in chunks:
        try:
            await send_fn(chunk, parse_mode='Markdown')
        except Exception:
            try:
                await send_fn(chunk)
            except Exception:
                pass
