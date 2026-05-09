import csv
import json
from datetime import datetime, timedelta
from pathlib import Path


class DataManager:
    def __init__(self, data_dir: str):
        self.root = Path(data_dir)
        self._init_dirs()

    def _init_dirs(self):
        for d in ['journal', 'fitness', 'money', 'content', 'english',
                  'gym', 'projects/logs', 'nofap', 'habits', 'goals']:
            (self.root / d).mkdir(parents=True, exist_ok=True)

    # ── helpers ──────────────────────────────────────────────────────────

    def today(self) -> str:
        return datetime.now().strftime('%Y-%m-%d')

    def week_range(self) -> str:
        now = datetime.now()
        start = now - timedelta(days=now.weekday())
        return f"{start.strftime('%d/%m')} – {now.strftime('%d/%m/%Y')}"

    def _read_csv(self, path: Path, days: int) -> list[dict]:
        if not path.exists():
            return []
        cutoff = datetime.now() - timedelta(days=days)
        rows = []
        try:
            with open(path, encoding='utf-8') as f:
                for row in csv.DictReader(f):
                    try:
                        if datetime.strptime(row['date'], '%Y-%m-%d') >= cutoff:
                            rows.append(row)
                    except Exception:
                        pass
        except Exception:
            pass
        return rows

    def _append_csv(self, path: Path, headers: list, row: list):
        exists = path.exists()
        with open(path, 'a', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            if not exists:
                w.writerow(headers)
            w.writerow(row)

    # ── journal ──────────────────────────────────────────────────────────

    def save_journal(self, text: str):
        path = self.root / 'journal' / f'{self.today()}.md'
        ts = datetime.now().strftime('%H:%M')
        with open(path, 'a', encoding='utf-8') as f:
            f.write(f"\n## {ts}\n{text}\n\n---\n")

    def get_recent_journal(self, days: int) -> str:
        parts = []
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            p = self.root / 'journal' / f'{date}.md'
            if p.exists():
                txt = p.read_text(encoding='utf-8').strip()
                if txt:
                    parts.append(f"**{date}:**\n{txt[:500]}")
        return '\n\n'.join(parts) or "אין יומן"

    def days_since_checkin(self) -> int:
        for i in range(30):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            if (self.root / 'journal' / f'{date}.md').exists():
                return i
        return 30

    # ── fitness ──────────────────────────────────────────────────────────

    def log_fitness(self, type_: str, details: str):
        self._append_csv(
            self.root / 'fitness' / 'log.csv',
            ['date', 'type', 'details', 'time'],
            [self.today(), type_, details, datetime.now().strftime('%H:%M')],
        )

    def get_recent_fitness(self, days: int) -> str:
        rows = self._read_csv(self.root / 'fitness' / 'log.csv', days)
        if not rows:
            return "אין נתוני כושר"
        return '\n'.join(f"{r['date']} | {r['type']} | {r['details']}" for r in rows)

    # ── money ────────────────────────────────────────────────────────────

    def add_expense(self, category: str, amount: float, description: str):
        self._append_csv(
            self.root / 'money' / 'expenses.csv',
            ['date', 'category', 'amount', 'description'],
            [self.today(), category, f"{amount:.2f}", description],
        )

    def get_recent_expenses(self, days: int) -> str:
        rows = self._read_csv(self.root / 'money' / 'expenses.csv', days)
        if not rows:
            return "אין הוצאות רשומות"
        total = sum(float(r['amount']) for r in rows)
        lines = [f"{r['date']} | {r['category']} | ₪{float(r['amount']):.0f} | {r['description']}"
                 for r in rows]
        return '\n'.join(lines) + f"\n\n*סה\"כ: ₪{total:.0f}*"

    # ── english ──────────────────────────────────────────────────────────

    def log_correction(self, original: str, response: str):
        p = self.root / 'english' / 'corrections.md'
        with open(p, 'a', encoding='utf-8') as f:
            f.write(f"\n## {self.today()}\n**מקורי:** {original}\n**תיקון:** {response[:300]}\n---\n")

    def get_mistakes(self) -> str:
        p = self.root / 'english' / 'corrections.md'
        if not p.exists():
            return "אין תיקונים עדיין"
        txt = p.read_text(encoding='utf-8')
        return txt[-800:] if len(txt) > 800 else txt

    # ── gym ──────────────────────────────────────────────────────────────

    def save_gym_note(self, query: str, response: str):
        p = self.root / 'gym' / 'notes.md'
        with open(p, 'a', encoding='utf-8') as f:
            f.write(f"\n## {self.today()}\n**שאלה:** {query}\n{response[:600]}\n---\n")

    # ── content ──────────────────────────────────────────────────────────

    def save_content_idea(self, notes: str, response: str):
        p = self.root / 'content' / 'ideas.md'
        with open(p, 'a', encoding='utf-8') as f:
            extra = f"\n**הערות:** {notes}" if notes else ""
            f.write(f"\n## {self.today()}{extra}\n{response}\n---\n")

    # ── projects ─────────────────────────────────────────────────────────

    def _proj_path(self) -> Path:
        return self.root / 'projects' / 'projects.json'

    def _load_projects(self) -> dict:
        p = self._proj_path()
        if not p.exists():
            return {"projects": []}
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return {"projects": []}

    def _save_projects(self, data: dict):
        self._proj_path().write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    def get_projects(self) -> list:
        return self._load_projects().get('projects', [])

    def add_project(self, name: str, deadline: str, tasks: list) -> str:
        data = self._load_projects()
        pid = f"p{len(data['projects']) + 1}"
        data['projects'].append({
            "id": pid, "name": name, "status": "active",
            "deadline": deadline, "tasks": tasks,
            "completed_tasks": [], "log": [],
        })
        self._save_projects(data)
        return pid

    def log_project(self, pid: str, note: str):
        data = self._load_projects()
        for p in data['projects']:
            if p['id'] == pid:
                p.setdefault('log', []).append({"date": self.today(), "note": note})
                break
        self._save_projects(data)

    def update_project_status(self, pid: str, status: str):
        data = self._load_projects()
        for p in data['projects']:
            if p['id'] == pid:
                p['status'] = status
                break
        self._save_projects(data)

    def complete_task(self, pid: str, task: str):
        data = self._load_projects()
        for p in data['projects']:
            if p['id'] == pid and task in p.get('tasks', []):
                p.setdefault('completed_tasks', []).append(task)
                break
        self._save_projects(data)

    def get_active_projects(self) -> str:
        projects = [p for p in self.get_projects() if p.get('status') == 'active']
        if not projects:
            return "אין פרויקטים פעילים"
        lines = []
        for p in projects:
            done = len(p.get('completed_tasks', []))
            total = len(p.get('tasks', []))
            lines.append(f"• {p['name']} ({done}/{total} משימות, עד {p.get('deadline', '?')})")
        return '\n'.join(lines)

    def get_projects_summary(self) -> str:
        projects = self.get_projects()
        if not projects:
            return "אין פרויקטים"
        icons = {'active': '🟢', 'paused': '🟡', 'planning': '🔵', 'done': '✅'}
        lines = []
        for p in projects:
            icon = icons.get(p.get('status', 'planning'), '⚪')
            done = len(p.get('completed_tasks', []))
            total = len(p.get('tasks', []))
            lines.append(f"{icon} {p['name']} ({done}/{total}) — {p.get('deadline', '?')}")
        return '\n'.join(lines)

    def get_projects_for_analysis(self) -> str:
        projects = self.get_projects()
        if not projects:
            return "אין פרויקטים"
        lines = []
        for p in projects:
            done = len(p.get('completed_tasks', []))
            total = len(p.get('tasks', []))
            lines.append(
                f"• {p['name']} [{p.get('status','?')}] {done}/{total} משימות, עד {p.get('deadline','?')}"
            )
            if p.get('log'):
                last = p['log'][-1]
                lines.append(f"  אחרון: {last['date']} — {last['note']}")
        return '\n'.join(lines)

    # ── nofap ────────────────────────────────────────────────────────────

    def _nofap_path(self) -> Path:
        return self.root / 'nofap' / 'log.json'

    def _load_nofap(self) -> dict:
        p = self._nofap_path()
        if not p.exists():
            return {"start_date": None, "resets": []}
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return {"start_date": None, "resets": []}

    def _save_nofap(self, data: dict):
        self._nofap_path().write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    def nofap_streak(self) -> int:
        data = self._load_nofap()
        if not data.get('start_date'):
            return 0
        start = datetime.strptime(data['start_date'], '%Y-%m-%d')
        return (datetime.now() - start).days

    def nofap_start(self):
        data = self._load_nofap()
        data['start_date'] = self.today()
        self._save_nofap(data)

    def nofap_reset(self) -> int:
        data = self._load_nofap()
        streak = self.nofap_streak()
        data.setdefault('resets', []).append({"date": self.today(), "streak": streak})
        data['start_date'] = self.today()
        self._save_nofap(data)
        return streak

    def nofap_history(self) -> str:
        resets = self._load_nofap().get('resets', [])
        if not resets:
            return "אין היסטוריה"
        return '\n'.join(f"{r['date']}: {r['streak']} ימים" for r in resets[-5:])

    # ── habits ───────────────────────────────────────────────────────────

    def _habits_cfg_path(self) -> Path:
        return self.root / 'habits' / 'habits.json'

    def _load_habits_cfg(self) -> dict:
        p = self._habits_cfg_path()
        if not p.exists():
            return {"habits": []}
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return {"habits": []}

    def _save_habits_cfg(self, data: dict):
        self._habits_cfg_path().write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    def get_habits(self) -> list:
        return self._load_habits_cfg().get('habits', [])

    def add_habit(self, name: str, emoji: str = "⚡") -> str:
        data = self._load_habits_cfg()
        hid = f"h{len(data['habits']) + 1}"
        data['habits'].append({"id": hid, "name": name, "emoji": emoji})
        self._save_habits_cfg(data)
        return hid

    def remove_habit(self, hid: str):
        data = self._load_habits_cfg()
        data['habits'] = [h for h in data['habits'] if h['id'] != hid]
        self._save_habits_cfg(data)

    def log_habit(self, hid: str, done: bool):
        self._append_csv(
            self.root / 'habits' / 'log.csv',
            ['date', 'habit_id', 'done'],
            [self.today(), hid, '1' if done else '0'],
        )

    def get_habits_today(self) -> dict[str, bool]:
        today = self.today()
        done: dict[str, bool] = {}
        p = self.root / 'habits' / 'log.csv'
        if p.exists():
            with open(p, encoding='utf-8') as f:
                for row in csv.DictReader(f):
                    if row['date'] == today:
                        done[row['habit_id']] = row['done'] == '1'
        return done

    def get_habits_yesterday_summary(self) -> str:
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        habits = self.get_habits()
        if not habits:
            return "אין הרגלים"
        done_ids: set[str] = set()
        p = self.root / 'habits' / 'log.csv'
        if p.exists():
            with open(p, encoding='utf-8') as f:
                for row in csv.DictReader(f):
                    if row['date'] == yesterday and row['done'] == '1':
                        done_ids.add(row['habit_id'])
        lines = [
            f"{'✅' if h['id'] in done_ids else '❌'} {h.get('emoji','')} {h['name']}"
            for h in habits
        ]
        return f"{len(done_ids)}/{len(habits)} הרגלים\n" + '\n'.join(lines)

    def get_habits_week_data(self) -> str:
        habits = self.get_habits()
        if not habits:
            return "אין הרגלים מוגדרים"
        rows = self._read_csv(self.root / 'habits' / 'log.csv', 7)
        lines = []
        for h in habits:
            done = sum(1 for r in rows if r['habit_id'] == h['id'] and r['done'] == '1')
            lines.append(f"{h.get('emoji','⚡')} {h['name']}: {done}/7")
        return '\n'.join(lines)

    # ── goals ────────────────────────────────────────────────────────────

    def _goals_path(self) -> Path:
        return self.root / 'goals' / 'goals.json'

    def _load_goals(self) -> dict:
        p = self._goals_path()
        if not p.exists():
            return {"goals": []}
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return {"goals": []}

    def _save_goals(self, data: dict):
        self._goals_path().write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    def add_goal(self, name: str, category: str, deadline: str, why: str) -> str:
        data = self._load_goals()
        gid = f"g{len(data['goals']) + 1}"
        data['goals'].append({
            "id": gid, "name": name, "category": category,
            "deadline": deadline, "why": why,
            "status": "active", "created": self.today(),
            "steps": [], "completed_steps": [],
        })
        self._save_goals(data)
        return gid

    def update_goal_steps(self, gid: str, steps: list):
        data = self._load_goals()
        for g in data['goals']:
            if g['id'] == gid:
                g['steps'] = steps
                break
        self._save_goals(data)

    def get_goals(self) -> list:
        return self._load_goals().get('goals', [])

    def get_goals_summary(self) -> str:
        goals = [g for g in self.get_goals() if g.get('status') == 'active']
        if not goals:
            return "אין מטרות פעילות"
        cat_icons = {
            'כושר': '💪', 'כסף': '💰', 'תוכן': '🎬',
            'עסק': '🏢', 'אנגלית': '📚', 'רוחניות': '🌊',
        }
        lines = []
        for g in goals:
            icon = cat_icons.get(g.get('category', ''), '🎯')
            done = len(g.get('completed_steps', []))
            total = len(g.get('steps', []))
            lines.append(f"{icon} {g['name']} ({done}/{total}) — עד {g.get('deadline', '?')}")
        return '\n'.join(lines)

    def get_goals_for_analysis(self) -> str:
        goals = [g for g in self.get_goals() if g.get('status') == 'active']
        if not goals:
            return "אין מטרות"
        lines = []
        for g in goals:
            lines.append(f"• {g['name']} [{g.get('category','?')}] עד {g.get('deadline','?')}")
            lines.append(f"  למה: {g.get('why','?')}")
            done = len(g.get('completed_steps', []))
            total = len(g.get('steps', []))
            lines.append(f"  שלבים: {done}/{total}")
        return '\n'.join(lines)
