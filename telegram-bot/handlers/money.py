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
ENTER_AMOUNT = 1

CATEGORIES = [
    ("🍕 אוכל", "אוכל"), ("⛽ דלק", "דלק"),
    ("🎮 בילוי", "בילוי"), ("💊 בריאות", "בריאות"),
    ("🛒 קניות", "קניות"), ("☕ קפה", "קפה"),
    ("👕 ביגוד", "ביגוד"), ("➕ אחר", "אחר"),
]


def _main_keyboard():
    rows = []
    for i in range(0, len(CATEGORIES), 2):
        row = []
        for label, val in CATEGORIES[i:i+2]:
            row.append(InlineKeyboardButton(label, callback_data=f"money_cat_{val}"))
        rows.append(row)
    rows.append([InlineKeyboardButton("📊 ניתוח חודשי", callback_data="money_analyze")])
    rows.append([InlineKeyboardButton("❌ ביטול", callback_data="money_cancel")])
    return InlineKeyboardMarkup(rows)


async def money_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    dm = DataManager(DATA_DIR)
    recent = dm.get_recent_expenses(7)
    text = f"💰 *הוצאות 7 ימים אחרונים:*\n{recent}\n\nבחר קטגוריה:"
    await update.message.reply_text(text, reply_markup=_main_keyboard(), parse_mode='Markdown')
    return CHOOSE_CAT


async def money_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "money_cancel":
        await query.edit_message_text("ביטול.")
        return ConversationHandler.END

    if query.data == "money_analyze":
        await query.edit_message_text("⏳ מנתח הוצאות...")
        dm = DataManager(DATA_DIR)
        prompt = build_prompt("money_analyze", {
            "expenses": dm.get_recent_expenses(30),
            "period": "30 ימים",
        })
        response = await ask_claude(prompt)
        await safe_send(update, response)
        return ConversationHandler.END

    category = query.data.replace("money_cat_", "")
    context.user_data['money_category'] = category
    await query.edit_message_text(
        f"📂 *קטגוריה: {category}*\n\nשלח סכום (ותיאור קצר אופציונלי)\nדוגמה: `45` או `45 שוורמה`",
        parse_mode='Markdown',
    )
    return ENTER_AMOUNT


async def money_save(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    text = update.message.text.strip()
    parts = text.split(maxsplit=1)
    try:
        amount = float(parts[0])
        description = parts[1] if len(parts) > 1 else context.user_data.get('money_category', '')
        category = context.user_data.get('money_category', 'אחר')
        dm = DataManager(DATA_DIR)
        dm.add_expense(category, amount, description)
        await update.message.reply_text(
            f"✅ נרשם: *{description}* — ₪{amount:.0f} ({category})",
            parse_mode='Markdown',
        )
    except (ValueError, IndexError):
        await update.message.reply_text("❌ שלח: `סכום תיאור` דוגמה: `45 שוורמה`")

    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("ביטול.")
    return ConversationHandler.END


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[CommandHandler("money", money_start)],
        states={
            CHOOSE_CAT: [CallbackQueryHandler(money_category, pattern="^money_")],
            ENTER_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, money_save)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
