import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, ConversationHandler,
    CommandHandler,
)

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send

def _daily_keyboard(habits: list, done: dict):
    rows = []
    for h in habits:
        status = "✅" if done.get(h['id']) else "⬜"
        label = f"{status} {h.get('emoji', '⚡')} {h['name']}"
        rows.append([InlineKeyboardButton(label, callback_data=f"habit_toggle_{h['id']}")])
    rows.append([
        InlineKeyboardButton("➕ הוסף הרגל", callback_data="habit_add"),
        InlineKeyboardButton("📊 ניתוח", callback_data="habit_analyze"),
    ])
    return InlineKeyboardMarkup(rows)


async def habits_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    dm = DataManager(DATA_DIR)
    habits = dm.get_habits()
    done = dm.get_habits_today()

    if not habits:
        await update.message.reply_text(
            "✅ *הרגלים יומיים*\n\nאין הרגלים עדיין.\nשלח /habits add <שם> להוסיף.\n\nדוגמאות:\n`/habits add תפילין`\n`/habits add אימון`\n`/habits add 8 כוסות מים`",
            parse_mode='Markdown',
        )
        return ConversationHandler.END

    # Quick add via args
    if context.args and context.args[0].lower() == 'add':
        name = ' '.join(context.args[1:])
        if name:
            dm.add_habit(name)
            await update.message.reply_text(f"✅ הרגל נוסף: *{name}*", parse_mode='Markdown')
            return ConversationHandler.END
        else:
            await update.message.reply_text("שלח שם הרגל אחרי add:\n`/habits add תפילין`", parse_mode='Markdown')
            return ConversationHandler.END

    done_count = sum(1 for h in habits if done.get(h['id']))
    header = f"✅ *הרגלים — {dm.today()}*\n*{done_count}/{len(habits)}* הושלמו\n\n"
    await update.message.reply_text(
        header + "לחץ לסמן / לבטל:",
        reply_markup=_daily_keyboard(habits, done),
        parse_mode='Markdown',
    )
    return ConversationHandler.END


async def habits_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return

    dm = DataManager(DATA_DIR)
    action = query.data

    if action == "habit_analyze":
        await query.edit_message_text("⏳ מנתח הרגלים...")
        prompt = build_prompt("habits_analyze", {
            "habits_data": dm.get_habits_week_data(),
            "period": "7 ימים",
        })
        response = await ask_claude(prompt)
        await safe_send(update, response)
        return

    if action == "habit_add":
        await query.message.reply_text(
            "📝 שלח את שם ההרגל:\n`/habits add תפילין`\n`/habits add אימון`\n`/habits add 8 כוסות מים`",
            parse_mode='Markdown',
        )
        return

    if action.startswith("habit_toggle_"):
        hid = action.replace("habit_toggle_", "")
        habits = dm.get_habits()
        done = dm.get_habits_today()
        current = done.get(hid, False)
        dm.log_habit(hid, not current)

        # Refresh keyboard
        done = dm.get_habits_today()
        done_count = sum(1 for h in habits if done.get(h['id']))
        header = f"✅ *הרגלים — {dm.today()}*\n*{done_count}/{len(habits)}* הושלמו\n\n"
        try:
            await query.edit_message_text(
                header + "לחץ לסמן / לבטל:",
                reply_markup=_daily_keyboard(habits, done),
                parse_mode='Markdown',
            )
        except Exception:
            pass


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[CommandHandler("habits", habits_handler)],
        states={},
        fallbacks=[],
        per_message=False,
    )
