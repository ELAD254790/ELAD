import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import ContextTypes

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send


async def content_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    msg = update.message or update.callback_query.message
    await msg.reply_text("⏳ מייצר רעיונות תוכן...")

    notes = ' '.join(context.args) if context.args else ''
    dm = DataManager(DATA_DIR)

    prompt = build_prompt("content", {
        "notes": notes,
        "journal": dm.get_recent_journal(5),
    })
    response = await ask_claude(prompt)
    dm.save_content_idea(notes, response)
    await safe_send(update, response)
