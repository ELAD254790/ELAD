import logging
import sys
from datetime import time as dt_time
from pathlib import Path

import pytz
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    ContextTypes,
)

sys.path.insert(0, str(Path(__file__).parent))

from config import TOKEN, ALLOWED_CHAT_ID, DATA_DIR
from data_manager import DataManager
from utils import safe_send_to

# ── Import handlers ──────────────────────────────────────────────────────────
from handlers.brief import brief_handler, send_brief
from handlers.checkin import get_conv_handler as checkin_conv
from handlers.content import content_handler
from handlers.english import english_handler
from handlers.money import get_conv_handler as money_conv
from handlers.fitness import get_conv_handler as fitness_conv
from handlers.gym import gym_handler, gym_callback
from handlers.week import week_handler
from handlers.projects import get_conv_handler as projects_conv
from handlers.deep import get_conv_handler as deep_conv
from handlers.mirror import mirror_handler, auto_mirror
from handlers.nofap import nofap_handler, nofap_callback
from handlers.habits import get_conv_handler as habits_conv, habits_callback
from handlers.goals import get_conv_handler as goals_conv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

ISRAEL_TZ = pytz.timezone('Asia/Jerusalem')

# ── Menu ─────────────────────────────────────────────────────────────────────

MENU_KEYBOARD = InlineKeyboardMarkup([
    [InlineKeyboardButton("⚡ בריפינג", callback_data="m_brief"),
     InlineKeyboardButton("📝 צ'ק אין", callback_data="m_checkin")],
    [InlineKeyboardButton("💪 כושר", callback_data="m_fitness"),
     InlineKeyboardButton("💰 כסף", callback_data="m_money")],
    [InlineKeyboardButton("🎬 תוכן", callback_data="m_content"),
     InlineKeyboardButton("📋 פרויקטים", callback_data="m_projects")],
    [InlineKeyboardButton("🏋️ GYM", callback_data="m_gym"),
     InlineKeyboardButton("📚 אנגלית", callback_data="m_english")],
    [InlineKeyboardButton("🪞 מראה", callback_data="m_mirror"),
     InlineKeyboardButton("🌊 עומק", callback_data="m_deep")],
    [InlineKeyboardButton("🎯 מטרות", callback_data="m_goals"),
     InlineKeyboardButton("🔥 NoFap", callback_data="m_nofap")],
    [InlineKeyboardButton("✅ הרגלים", callback_data="m_habits"),
     InlineKeyboardButton("📊 שבועי", callback_data="m_week")],
])


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    dm = DataManager(DATA_DIR)
    streak = dm.nofap_streak()
    habits_done = dm.get_habits_yesterday_summary().split('\n')[0] if dm.get_habits() else "אין הרגלים"
    await update.message.reply_text(
        f"🎯 *Elad Command Center*\n\n"
        f"🔥 NoFap: *{streak} ימים*\n"
        f"✅ {habits_done}\n\n"
        "תבחר:",
        reply_markup=MENU_KEYBOARD,
        parse_mode='Markdown',
    )


async def menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return

    action = query.data.replace("m_", "")

    # Commands that work directly from callback
    direct_map = {
        "brief": brief_handler,
        "week": week_handler,
        "mirror": mirror_handler,
        "content": content_handler,
        "english": english_handler,
        "gym": gym_handler,
    }

    if action in direct_map:
        await query.edit_message_reply_markup(reply_markup=None)
        await direct_map[action](update, context)
        return

    # For conversation-based commands: inform user to type the command
    cmd_map = {
        "checkin": "/checkin",
        "fitness": "/fitness",
        "money": "/money",
        "projects": "/projects",
        "deep": "/deep",
        "goals": "/goals",
        "habits": "/habits",
        "nofap": "/nofap",
    }
    if action in cmd_map:
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text(
            f"שלח {cmd_map[action]} להתחיל 👇",
        )


# ── Scheduled jobs ────────────────────────────────────────────────────────────

async def job_morning_brief(context):
    dm = DataManager(DATA_DIR)
    await send_brief(context.bot, ALLOWED_CHAT_ID, dm)


async def job_evening_reminder(context):
    await safe_send_to(
        context.bot, ALLOWED_CHAT_ID,
        "🌙 *ערב טוב אלעד*\n\nזמן לצ'ק אין יומי — /checkin"
    )


async def job_sunday_kickoff(context):
    await safe_send_to(
        context.bot, ALLOWED_CHAT_ID,
        "☀️ *שבוע חדש, אלעד.*\n\nמה הדבר האחד שחייב לקרות השבוע?\nשלח /brief לבריפינג מלא."
    )


async def job_saturday_review(context):
    await safe_send_to(
        context.bot, ALLOWED_CHAT_ID,
        "📊 *זמן לסיכום שבועי*\n\nשלח /week"
    )


async def job_mirror_check(context):
    dm = DataManager(DATA_DIR)
    days = dm.days_since_checkin()
    if days >= 2:
        await auto_mirror(context.bot, ALLOWED_CHAT_ID, dm)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    app = Application.builder().token(TOKEN).build()

    # Conversation handlers (must be first)
    app.add_handler(checkin_conv())
    app.add_handler(money_conv())
    app.add_handler(fitness_conv())
    app.add_handler(projects_conv())
    app.add_handler(deep_conv())
    app.add_handler(habits_conv())
    app.add_handler(goals_conv())

    # Simple command handlers
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("menu", start_handler))
    app.add_handler(CommandHandler("brief", brief_handler))
    app.add_handler(CommandHandler("content", content_handler))
    app.add_handler(CommandHandler("english", english_handler))
    app.add_handler(CommandHandler("week", week_handler))
    app.add_handler(CommandHandler("mirror", mirror_handler))
    app.add_handler(CommandHandler("nofap", nofap_handler))
    app.add_handler(CommandHandler("gym", gym_handler))

    # Callback handlers
    app.add_handler(CallbackQueryHandler(menu_callback, pattern="^m_"))
    app.add_handler(CallbackQueryHandler(gym_callback, pattern="^gym_"))
    app.add_handler(CallbackQueryHandler(nofap_callback, pattern="^nofap_"))
    app.add_handler(CallbackQueryHandler(habits_callback, pattern="^habit_"))

    # Scheduled jobs (Israel time)
    jq = app.job_queue
    jq.run_daily(job_morning_brief,   time=dt_time(6,  0, tzinfo=ISRAEL_TZ))
    jq.run_daily(job_evening_reminder, time=dt_time(21, 0, tzinfo=ISRAEL_TZ))
    jq.run_daily(job_mirror_check,    time=dt_time(20, 30, tzinfo=ISRAEL_TZ))
    jq.run_daily(job_sunday_kickoff,  time=dt_time(9,  0, tzinfo=ISRAEL_TZ), days=(6,))
    jq.run_daily(job_saturday_review, time=dt_time(20, 0, tzinfo=ISRAEL_TZ), days=(5,))

    logger.info("🎯 Elad Command Center — מופעל")
    print("\n🎯 Elad Command Center פעיל — שלח /start בטלגרם\n")
    app.run_polling(drop_pending_updates=True)


if __name__ == '__main__':
    main()
