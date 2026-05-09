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


async def brief_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    msg = update.message or update.callback_query.message
    await msg.reply_text("⏳ בונה בריפינג...")

    dm = DataManager(DATA_DIR)
    prompt = build_prompt("brief", {
        "today": dm.today(),
        "nofap_days": dm.nofap_streak(),
        "journal": dm.get_recent_journal(3),
        "fitness": dm.get_recent_fitness(3),
        "projects": dm.get_active_projects(),
        "habits_yesterday": dm.get_habits_yesterday_summary(),
    })
    response = await ask_claude(prompt)
    await safe_send(update, response)


async def send_brief(bot, chat_id: int, dm: DataManager):
    """Called by the scheduler."""
    prompt = build_prompt("brief", {
        "today": dm.today(),
        "nofap_days": dm.nofap_streak(),
        "journal": dm.get_recent_journal(3),
        "fitness": dm.get_recent_fitness(3),
        "projects": dm.get_active_projects(),
        "habits_yesterday": dm.get_habits_yesterday_summary(),
    })
    response = await ask_claude(prompt)
    await safe_send_to(bot, chat_id, f"☀️ *בריפינג יומי*\n\n{response}")
