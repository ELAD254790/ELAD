import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import (
    ContextTypes, ConversationHandler,
    CommandHandler, MessageHandler, filters,
)

from claude_runner import ask_claude
from config import ALLOWED_CHAT_ID
from elad_context import build_prompt
from utils import safe_send

WAIT_TOPIC = 0


async def deep_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    # If topic given inline: /deep ענווה
    if context.args:
        topic = ' '.join(context.args)
        await update.message.reply_text("⏳ יורד לעומק...")
        prompt = build_prompt("deep", {"topic": topic})
        response = await ask_claude(prompt, timeout=180)
        await safe_send(update, response)
        return ConversationHandler.END

    await update.message.reply_text(
        "🌊 *שיחה עמוקה*\n\nעל מה תרצה לדון?\nקבלה, תניא, ייעוד, נפש, כעס, תאווה, יצר, ענווה, אמונה — או כל דבר אחר.",
        parse_mode='Markdown',
    )
    return WAIT_TOPIC


async def deep_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    topic = update.message.text
    await update.message.reply_text("⏳ יורד לעומק...")
    prompt = build_prompt("deep", {"topic": topic})
    response = await ask_claude(prompt, timeout=180)
    await safe_send(update, response)
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("ביטול.")
    return ConversationHandler.END


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[CommandHandler("deep", deep_start)],
        states={
            WAIT_TOPIC: [MessageHandler(filters.TEXT & ~filters.COMMAND, deep_receive)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
