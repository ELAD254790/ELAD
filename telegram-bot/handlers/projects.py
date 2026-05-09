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

ENTER_NAME = 0
ENTER_DEADLINE = 1
ENTER_TASKS = 2

STATUS_ICONS = {'active': '🟢', 'paused': '🟡', 'planning': '🔵', 'done': '✅'}


def _projects_keyboard(projects: list):
    rows = []
    for p in projects:
        icon = STATUS_ICONS.get(p.get('status', 'planning'), '⚪')
        done = len(p.get('completed_tasks', []))
        total = len(p.get('tasks', []))
        label = f"{icon} {p['name']} ({done}/{total})"
        rows.append([InlineKeyboardButton(label, callback_data=f"proj_view_{p['id']}")])
    rows.append([
        InlineKeyboardButton("➕ פרויקט חדש", callback_data="proj_new"),
        InlineKeyboardButton("📊 סקירה", callback_data="proj_review"),
    ])
    return InlineKeyboardMarkup(rows)


def _project_keyboard(pid: str, status: str):
    rows = [
        [InlineKeyboardButton("📝 הוסף לוג", callback_data=f"proj_log_{pid}")],
    ]
    if status == 'active':
        rows.append([InlineKeyboardButton("⏸️ עצור", callback_data=f"proj_pause_{pid}")])
    elif status == 'paused':
        rows.append([InlineKeyboardButton("▶️ המשך", callback_data=f"proj_resume_{pid}")])
    rows.append([
        InlineKeyboardButton("✅ סיים", callback_data=f"proj_done_{pid}"),
        InlineKeyboardButton("🔙 חזור", callback_data="proj_back"),
    ])
    return InlineKeyboardMarkup(rows)


async def projects_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    dm = DataManager(DATA_DIR)
    projects = dm.get_projects()

    if not projects:
        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("➕ פרויקט ראשון", callback_data="proj_new")
        ]])
        await update.message.reply_text(
            "📋 *פרויקטים*\n\nאין פרויקטים עדיין.\n",
            reply_markup=keyboard,
            parse_mode='Markdown',
        )
        return ConversationHandler.END

    summary = dm.get_projects_summary()
    await update.message.reply_text(
        f"📋 *הפרויקטים שלך:*\n\n{summary}\n",
        reply_markup=_projects_keyboard(projects),
        parse_mode='Markdown',
    )
    return ConversationHandler.END


async def projects_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    dm = DataManager(DATA_DIR)
    action = query.data

    if action == "proj_new":
        await query.edit_message_text("📋 *פרויקט חדש*\n\nמה שם הפרויקט?", parse_mode='Markdown')
        return ENTER_NAME

    if action == "proj_review":
        await query.edit_message_text("⏳ מנתח פרויקטים...")
        prompt = build_prompt("projects_plan", {
            "name": "כל הפרויקטים",
            "tasks": dm.get_projects_for_analysis(),
            "deadline": "",
        })
        response = await ask_claude(prompt)
        await safe_send(update, response)
        return ConversationHandler.END

    if action == "proj_back":
        projects = dm.get_projects()
        summary = dm.get_projects_summary()
        await query.edit_message_text(
            f"📋 *הפרויקטים שלך:*\n\n{summary}\n",
            reply_markup=_projects_keyboard(projects),
            parse_mode='Markdown',
        )
        return ConversationHandler.END

    if action.startswith("proj_view_"):
        pid = action.replace("proj_view_", "")
        projects = dm.get_projects()
        p = next((x for x in projects if x['id'] == pid), None)
        if not p:
            return ConversationHandler.END
        done = len(p.get('completed_tasks', []))
        total = len(p.get('tasks', []))
        tasks_text = '\n'.join(f"{'✅' if t in p.get('completed_tasks',[]) else '⬜'} {t}" for t in p.get('tasks', []))
        log = p.get('log', [])
        last_log = f"\nאחרון: {log[-1]['date']} — {log[-1]['note']}" if log else ""
        text = (
            f"📋 *{p['name']}*\n"
            f"סטטוס: {STATUS_ICONS.get(p['status'],'')} {p['status']}\n"
            f"דדליין: {p.get('deadline','?')}\n"
            f"התקדמות: {done}/{total}\n\n"
            f"{tasks_text}{last_log}"
        )
        context.user_data['current_proj'] = pid
        await query.edit_message_text(text, reply_markup=_project_keyboard(pid, p['status']), parse_mode='Markdown')
        return ConversationHandler.END

    if action.startswith("proj_pause_"):
        pid = action.replace("proj_pause_", "")
        dm.update_project_status(pid, "paused")
        await query.answer("⏸️ הפרויקט הועצר")
        return ConversationHandler.END

    if action.startswith("proj_resume_"):
        pid = action.replace("proj_resume_", "")
        dm.update_project_status(pid, "active")
        await query.answer("▶️ הפרויקט חודש")
        return ConversationHandler.END

    if action.startswith("proj_done_"):
        pid = action.replace("proj_done_", "")
        dm.update_project_status(pid, "done")
        await query.edit_message_text("✅ *פרויקט הושלם!*\n\nאלעד — כל הכבוד על הביצוע.", parse_mode='Markdown')
        return ConversationHandler.END

    if action.startswith("proj_log_"):
        pid = action.replace("proj_log_", "")
        context.user_data['log_proj'] = pid
        await query.edit_message_text("📝 שלח עדכון קצר לפרויקט:")
        return ConversationHandler.END

    return ConversationHandler.END


async def proj_name_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END
    context.user_data['proj_name'] = update.message.text.strip()
    await update.message.reply_text("📅 מתי הדדליין?\nדוגמה: `2026-08-01`")
    return ENTER_DEADLINE


async def proj_deadline_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END
    context.user_data['proj_deadline'] = update.message.text.strip()
    await update.message.reply_text(
        "📋 שלח רשימת משימות (כל משימה בשורה חדשה):\nדוגמה:\nכתיבת סקריפט\nצילום\nעריכה"
    )
    return ENTER_TASKS


async def proj_tasks_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END

    tasks_text = update.message.text.strip()
    tasks = [t.strip() for t in tasks_text.split('\n') if t.strip()]
    name = context.user_data.get('proj_name', '')
    deadline = context.user_data.get('proj_deadline', '')

    dm = DataManager(DATA_DIR)
    pid = dm.add_project(name, deadline, tasks)

    await update.message.reply_text(f"✅ *{name}* נוסף!\n\nבונה תוכנית עם Claude...", parse_mode='Markdown')
    prompt = build_prompt("projects_plan", {
        "name": name, "deadline": deadline,
        "tasks": '\n'.join(f"• {t}" for t in tasks),
    })
    response = await ask_claude(prompt)
    await safe_send(update, response)
    return ConversationHandler.END


async def proj_log_receive(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return ConversationHandler.END
    pid = context.user_data.get('log_proj')
    if pid:
        note = update.message.text.strip()
        dm = DataManager(DATA_DIR)
        dm.log_project(pid, note)
        await update.message.reply_text(f"✅ לוג נשמר: {note}")
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("ביטול.")
    return ConversationHandler.END


def get_conv_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[
            CommandHandler("projects", projects_handler),
            CallbackQueryHandler(projects_callback, pattern="^proj_"),
        ],
        states={
            ENTER_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, proj_name_receive)],
            ENTER_DEADLINE: [MessageHandler(filters.TEXT & ~filters.COMMAND, proj_deadline_receive)],
            ENTER_TASKS: [MessageHandler(filters.TEXT & ~filters.COMMAND, proj_tasks_receive)],
            ConversationHandler.END: [
                CallbackQueryHandler(proj_log_receive, pattern="^proj_log_save"),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        per_message=False,
    )
