import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, CommandHandler

from claude_runner import ask_claude
from config import DATA_DIR, ALLOWED_CHAT_ID
from data_manager import DataManager
from elad_context import build_prompt
from utils import safe_send

GYM_OPTIONS = [
    ("🗣️ סקריפט מכירה", "gym_sales", "תכתוב לי סקריפט מכירה יומי לדלפק ספייס שיעזור לי למכור תוספי תזונה ומנויים — ספציפי ועם דוגמאות שיחה"),
    ("📦 המלצת מוצר", "gym_product", "המלץ על 3 תוספי תזונה שאפשר לקדם היום בדלפק עם הסבר קצר לכל אחד"),
    ("🎯 יעד יומי", "gym_target", "תן לי יעד מכירות ריאלי להיום לדלפק ספייס — עם פירוט מה צריך למכור"),
    ("💡 רעיון שיפור", "gym_improve", "תן לי רעיון אחד קונקרטי לשיפור שירות הלקוחות בדלפק ספייס שאפשר ליישם היום"),
    ("📝 הערת מלאי", "gym_stock", "אתן לך מוצרים שנגמרים — תכין לי הערת מלאי מסודרת להזמנה"),
    ("💰 חבילות ומבצעים", "gym_bundles", "תבנה לי 2 חבילות מכירה אטרקטיביות לספייס שאפשר להציע היום"),
]


def _keyboard():
    rows = []
    for i in range(0, len(GYM_OPTIONS), 2):
        row = [InlineKeyboardButton(label, callback_data=cb)
               for label, cb, _ in GYM_OPTIONS[i:i+2]]
        rows.append(row)
    return InlineKeyboardMarkup(rows)


async def gym_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != ALLOWED_CHAT_ID:
        return
    msg = update.message or update.callback_query.message

    # Direct query: /gym <question>
    if context.args:
        query = ' '.join(context.args)
        await msg.reply_text("⏳ מכין...")
        dm = DataManager(DATA_DIR)
        prompt = build_prompt("gym", {"query": query})
        response = await ask_claude(prompt)
        dm.save_gym_note(query, response)
        await safe_send(update, response)
        return

    await msg.reply_text(
        "🏋️ *SPACE Gym — מה צריך?*",
        reply_markup=_keyboard(),
        parse_mode='Markdown',
    )


async def gym_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    option_map = {cb: txt for _, cb, txt in GYM_OPTIONS}
    query_text = option_map.get(query.data, '')
    if not query_text:
        return

    await query.edit_message_text("⏳ מכין...")
    dm = DataManager(DATA_DIR)
    prompt = build_prompt("gym", {"query": query_text})
    response = await ask_claude(prompt)
    dm.save_gym_note(query_text, response)
    await safe_send(update, response)
