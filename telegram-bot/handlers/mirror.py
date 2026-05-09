import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import ContextTypes

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send, safe_send_to


async def mirror_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    msg = update.message or update.callback_query.message
    await msg.reply_text("🪞 מכין שיקוף...")

    dm = DataManager(DATA_DIR)
    prompt = build_prompt("mirror", {
        "nofap_days": dm.nofap_streak(),
        "journal": dm.get_recent_journal(3),
        "habits": dm.get_habits_week_data(),
        "projects": dm.get_active_projects(),
    })
    response = await ask_claude(prompt)
    await safe_send(update, response)


async def auto_mirror(bot, chat_id: int, dm: DataManager):
    """Called by scheduler when no check-in for 2+ days."""
    days = dm.days_since_checkin()
    prompt = build_prompt("mirror", {
        "nofap_days": dm.nofap_streak(),
        "journal": dm.get_recent_journal(3),
        "habits": dm.get_habits_week_data(),
        "projects": dm.get_active_projects(),
    })
    response = await ask_claude(prompt)
    header = f"🪞 *{days} ימים בלי צ'ק אין, אלעד.*\n\n"
    await safe_send_to(bot, chat_id, header + response)
