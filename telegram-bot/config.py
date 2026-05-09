import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
ALLOWED_CHAT_ID = int(os.getenv('TELEGRAM_CHAT_ID', '0'))
DATA_DIR = os.getenv('DATA_DIR', str(Path(__file__).parent.parent / 'data'))

if not TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN חסר ב-.env")
if not ALLOWED_CHAT_ID:
    raise ValueError("TELEGRAM_CHAT_ID חסר ב-.env")
