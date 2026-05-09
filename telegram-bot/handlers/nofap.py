import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send


def _keyboard(has_streak: bool):
    rows = [
        [InlineKeyboardButton("📊 מצב נוכחי", callback_data="nofap_status"),
         InlineKeyboardButton("🆘 עזרה עכשיו", callback_data="nofap_help")],
    ]
    if has_streak:
        rows.append([InlineKeyboardButton("🔄 נפלתי — אפס", callback_data="nofap_reset")])
    else:
        rows.append([InlineKeyboardButton("🚀 התחל מחדש", callback_data="nofap_start")])
    return InlineKeyboardMarkup(rows)


async def nofap_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return

    dm = DataManager(DATA_DIR)
    days = dm.nofap_streak()
    history = dm.nofap_history()

    # Handle subcommands: /nofap help, /nofap reset, /nofap start
    sub = context.args[0].lower() if context.args else ''

    if sub == 'help':
        await _handle_help(update, dm, days)
        return
    if sub == 'reset':
        await _handle_reset(update, dm)
        return
    if sub == 'start':
        dm.nofap_start()
        await update.message.reply_text("🔥 *יום 1 מתחיל עכשיו.*\nאלעד — קדימה.", parse_mode='Markdown')
        return

    # Main menu
    msg = (
        f"🔥 *NoFap — {days} ימים*\n\n"
        f"היסטוריה:\n{history}\n\n"
        "בחר:"
    )
    await update.message.reply_text(msg, reply_markup=_keyboard(days > 0), parse_mode='Markdown')


async def nofap_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return

    dm = DataManager(DATA_DIR)
    action = query.data

    if action == "nofap_status":
        await query.edit_message_text("⏳ מנתח...")
        days = dm.nofap_streak()
        prompt = build_prompt("nofap_check", {
            "days": days,
            "history": dm.nofap_history(),
        })
        response = await ask_claude(prompt)
        await safe_send(update, response)

    elif action == "nofap_help":
        await query.edit_message_text("🚨 עוצר — מכין עזרה מיידית...")
        days = dm.nofap_streak()
        prompt = build_prompt("nofap_help", {"days": days})
        response = await ask_claude(prompt)
        await safe_send(update, response)

    elif action == "nofap_reset":
        prev = dm.nofap_reset()
        await query.edit_message_text(f"🔄 *אפס — {prev} ימים.*\n\nיום 1 מחר.", parse_mode='Markdown')
        prompt = build_prompt("nofap_reset", {"days": prev})
        response = await ask_claude(prompt)
        await safe_send(update, response)

    elif action == "nofap_start":
        dm.nofap_start()
        await query.edit_message_text("🔥 *יום 1 מתחיל עכשיו.*", parse_mode='Markdown')


async def _handle_help(update: Update, dm: DataManager, days: int):
    await update.message.reply_text("🚨 עוצר — עוזר מיידית...")
    prompt = build_prompt("nofap_help", {"days": days})
    response = await ask_claude(prompt)
    await safe_send(update, response)


async def _handle_reset(update: Update, dm: DataManager):
    prev = dm.nofap_reset()
    await update.message.reply_text(f"🔄 אפס — {prev} ימים. יום 1 מחר.", parse_mode='Markdown')
    prompt = build_prompt("nofap_reset", {"days": prev})
    response = await ask_claude(prompt)
    await safe_send(update, response)
