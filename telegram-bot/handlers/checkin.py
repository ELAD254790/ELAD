import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import (
    ContextTypes, ConversationHandler,
    CommandHandler, MessageHandler, filters,
)

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send

WAIT_ANSWER = 0

QUESTIONS = """📝 *צ'ק אין ערב — 5 שאלות:*

1️⃣ מה עשית היום בפועל?
2️⃣ איפה בזבזת זמן?
3️⃣ מה נמנעת מלעשות?
4️⃣ על מה אתה גאה?
5️⃣ מה הפעולה האחת שאסור לפספס מחר?

שלח את כל התשובות בהודעה אחת."""


async def checkin_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END
    await update.message.reply_text(QUESTIONS, parse_mode='Markdown')
    return WAIT_ANSWER


async def checkin_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    text = update.message.text
    dm = DataManager(DATA_DIR)
    dm.save_journal(text)

    prompt = build_prompt("checkin_save", {"text": text})
    response = await ask_claude(prompt)
    await safe_send(update, response)
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("ביטול.")
    return ConversationHandler.END


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[CommandHandler("checkin", checkin_start)],
        states={
            WAIT_ANSWER: [MessageHandler(filters.TEXT & ~filters.COMMAND, checkin_receive)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
