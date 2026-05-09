import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, ConversationHandler,
    CommandHandler, CallbackQueryHandler, MessageHandler, filters,
)

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send

CHOOSE_TYPE = 0
ENTER_DATA = 1


def _main_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💪 רשום אימון", callback_data="fit_workout"),
         InlineKeyboardButton("🥗 תזונה", callback_data="fit_nutrition")],
        [InlineKeyboardButton("⚖️ מדידות", callback_data="fit_metrics"),
         InlineKeyboardButton("📈 ניתוח", callback_data="fit_analyze")],
        [InlineKeyboardButton("❌ ביטול", callback_data="fit_cancel")],
    ])


async def fitness_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    dm = DataManager(DATA_DIR)
    recent = dm.get_recent_fitness(5)
    await update.message.reply_text(
        f"💪 *מעקב כושר*\n\n{recent}\n\nבחר:",
        reply_markup=_main_keyboard(),
        parse_mode='Markdown',
    )
    return CHOOSE_TYPE


async def fitness_choose(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    action = query.data

    if action == "fit_cancel":
        await query.edit_message_text("ביטול.")
        return ConversationHandler.END

    if action == "fit_analyze":
        await query.edit_message_text("⏳ מנתח נתוני כושר...")
        dm = DataManager(DATA_DIR)
        prompt = build_prompt("fitness_analyze", {"data": dm.get_recent_fitness(14)})
        response = await ask_claude(prompt)
        await safe_send(update, response)
        return ConversationHandler.END

    context.user_data['fit_type'] = action

    prompts_map = {
        "fit_workout": "שלח תיאור האימון:\nדוגמה: `חזה + כתפיים | 4 סטים | משקל: 60 ק\"ג`",
        "fit_nutrition": "שלח קלוריות + חלבון + מים:\nדוגמה: `2800 קל | 180 ג חלבון | 3 ל מים`",
        "fit_metrics": "שלח משקל + צעדים:\nדוגמה: `78.5 ק\"ג | 9000 צעדים`",
    }
    await query.edit_message_text(prompts_map.get(action, "שלח נתונים:"))
    return ENTER_DATA


async def fitness_save(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    text = update.message.text.strip()
    fit_type = context.user_data.get('fit_type', 'fit_workout')
    dm = DataManager(DATA_DIR)

    type_map = {
        "fit_workout": "אימון",
        "fit_nutrition": "תזונה",
        "fit_metrics": "מדידות",
    }
    dm.log_fitness(type_map.get(fit_type, 'כללי'), text)
    await update.message.reply_text(f"✅ נרשם: {text}", parse_mode='Markdown')
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("ביטול.")
    return ConversationHandler.END


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[CommandHandler("fitness", fitness_start)],
        states={
            CHOOSE_TYPE: [CallbackQueryHandler(fitness_choose, pattern="^fit_")],
            ENTER_DATA: [MessageHandler(filters.TEXT & ~filters.COMMAND, fitness_save)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
