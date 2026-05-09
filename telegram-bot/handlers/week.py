import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import ContextTypes

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send


async def week_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    msg = update.message or update.callback_query.message
    await msg.reply_text("⏳ מכין סיכום שבועי...")

    dm = DataManager(DATA_DIR)
    prompt = build_prompt("week", {
        "week_range": dm.week_range(),
        "journal": dm.get_recent_journal(7),
        "fitness": dm.get_recent_fitness(7),
        "expenses": dm.get_recent_expenses(7),
        "habits": dm.get_habits_week_data(),
        "projects": dm.get_projects_for_analysis(),
    })
    response = await ask_claude(prompt, timeout=180)
    await safe_send(update, response)
