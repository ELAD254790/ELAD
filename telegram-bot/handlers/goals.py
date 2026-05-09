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

CHOOSE_CAT = 0
ENTER_NAME = 1
ENTER_DEADLINE = 2
ENTER_WHY = 3

CATEGORIES = ["כושר", "כסף", "תוכן", "עסק", "אנגלית", "רוחניות", "אחר"]
CAT_ICONS = {"כושר": "💪", "כסף": "💰", "תוכן": "🎬", "עסק": "🏢",
             "אנגלית": "📚", "רוחניות": "🌊", "אחר": "🎯"}


def _cat_keyboard():
    rows = []
    for i in range(0, len(CATEGORIES), 3):
        row = [InlineKeyboardButton(f"{CAT_ICONS.get(c,'🎯')} {c}", callback_data=f"goalcat_{c}")
               for c in CATEGORIES[i:i+3]]
        rows.append(row)
    return InlineKeyboardMarkup(rows)


async def goals_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    dm = DataManager(DATA_DIR)
    args = context.args or []

    if args and args[0] == 'review':
        await update.message.reply_text("⏳ סוקר מטרות...")
        prompt = build_prompt("goals_review", {"goals": dm.get_goals_for_analysis()})
        response = await ask_claude(prompt)
        await safe_send(update, response)
        return ConversationHandler.END

    if args and args[0] == 'new':
        await update.message.reply_text(
            "🎯 *מטרה חדשה — בחר קטגוריה:*",
            reply_markup=_cat_keyboard(),
            parse_mode='Markdown',
        )
        return CHOOSE_CAT

    # Default: show goals list
    summary = dm.get_goals_summary()
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ מטרה חדשה", callback_data="goals_new"),
         InlineKeyboardButton("📊 סקירה", callback_data="goals_review")],
    ])
    await update.message.reply_text(
        f"🎯 *המטרות שלך:*\n\n{summary}",
        reply_markup=keyboard,
        parse_mode='Markdown',
    )
    return ConversationHandler.END


async def goals_main_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    if query.data == "goals_new":
        await query.edit_message_text(
            "🎯 *מטרה חדשה — בחר קטגוריה:*",
            reply_markup=_cat_keyboard(),
            parse_mode='Markdown',
        )
        return CHOOSE_CAT

    if query.data == "goals_review":
        await query.edit_message_text("⏳ סוקר מטרות...")
        dm = DataManager(DATA_DIR)
        prompt = build_prompt("goals_review", {"goals": dm.get_goals_for_analysis()})
        response = await ask_claude(prompt)
        await safe_send(update, response)
        return ConversationHandler.END

    return ConversationHandler.END


async def goals_cat_chosen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    cat = query.data.replace("goalcat_", "")
    context.user_data['goal_cat'] = cat
    await query.edit_message_text(
        f"*קטגוריה: {CAT_ICONS.get(cat,'')} {cat}*\n\nמה שם המטרה?",
        parse_mode='Markdown',
    )
    return ENTER_NAME


async def goals_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['goal_name'] = update.message.text.strip()
    await update.message.reply_text(
        "📅 מתי הדדליין?\nדוגמה: `2026-08-01` או `סוף אוגוסט`"
    )
    return ENTER_DEADLINE


async def goals_deadline(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['goal_deadline'] = update.message.text.strip()
    await update.message.reply_text(
        "💡 *למה המטרה הזאת חשובה לך?*\n[משפט אחד — אמיתי]",
        parse_mode='Markdown',
    )
    return ENTER_WHY


async def goals_why(update: Update, context: ContextTypes.DEFAULT_TYPE):
    why = update.message.text.strip()
    name = context.user_data.get('goal_name', '')
    category = context.user_data.get('goal_cat', 'אחר')
    deadline = context.user_data.get('goal_deadline', '')

    dm = DataManager(DATA_DIR)
    gid = dm.add_goal(name, category, deadline, why)

    await update.message.reply_text("⏳ בונה תוכנית עם Claude...")
    prompt = build_prompt("goals_build", {
        "name": name, "category": category,
        "deadline": deadline, "why": why,
    })
    response = await ask_claude(prompt, timeout=180)
    await safe_send(update, response)
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("ביטול.")
    return ConversationHandler.END


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[
            CommandHandler("goals", goals_handler),
            CallbackQueryHandler(goals_main_callback, pattern="^goals_"),
        ],
        states={
            CHOOSE_CAT: [CallbackQueryHandler(goals_cat_chosen, pattern="^goalcat_")],
            ENTER_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, goals_name)],
            ENTER_DEADLINE: [MessageHandler(filters.TEXT & ~filters.COMMAND, goals_deadline)],
            ENTER_WHY: [MessageHandler(filters.TEXT & ~filters.COMMAND, goals_why)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
