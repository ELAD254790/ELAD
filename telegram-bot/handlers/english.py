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


async def english_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    msg = update.message or update.callback_query.message
    user_text = ' '.join(context.args) if context.args else ''

    await msg.reply_text("⏳ מכין תרגול אנגלית...")

    dm = DataManager(DATA_DIR)

    if user_text:
        prompt = build_prompt("english_correct", {"text": user_text})
        response = await ask_claude(prompt)
        dm.log_correction(user_text, response)
    else:
        prompt = build_prompt("english_drill", {"mistakes": dm.get_mistakes()})
        response = await ask_claude(prompt)

    await safe_send(update, response)
