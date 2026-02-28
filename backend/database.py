import sqlite3
from pathlib import Path
import hashlib
from datetime import datetime
import time

DB_PATH = Path(__file__).parent / "habitx.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        join_date TEXT,
        timezone TEXT
    )
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    habit_name TEXT,
    category TEXT,
    frequency TEXT,
    reminder_time TEXT,
    created_date TEXT,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    consistency REAL DEFAULT 0,
    active_days INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
"""
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER,
        date TEXT,
        status TEXT,
        FOREIGN KEY(habit_id) REFERENCES habits(id)
    )
    """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_logs_lookup
        ON habit_logs (habit_id, date)
        """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS daily_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        note_date TEXT NOT NULL,
        content TEXT,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(user_id, note_date),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        entity_id INTEGER,
        created_at TEXT,
        is_read INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """
    )
    cur.execute(
        """
    CREATE TABLE IF NOT EXISTS habit_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        template_group TEXT NOT NULL
    )
    """
    )
    count = cur.execute("SELECT COUNT(*) as c FROM habit_templates").fetchone()["c"]
    if count == 0:
        defaults = [
            ("Wake up at 6 AM", "productivity", "morning"),
            ("Morning Exercise", "health", "morning"),
            ("Meditation", "mindfulness", "morning"),
            ("Workout 30 mins", "health", "fitness"),
            ("Drink 8 glasses of water", "health", "fitness"),
            ("Healthy meal prep", "health", "fitness"),
            ("Deep work 2 hours", "productivity", "productivity"),
            ("Learn something new", "study", "productivity"),
            ("Read 30 pages", "study", "productivity"),
            ("Morning meditation", "mindfulness", "wellness"),
            ("Gratitude journal", "mindfulness", "wellness"),
            ("Evening reflection", "mindfulness", "wellness"),
        ]
        cur.executemany(
            """
            INSERT INTO habit_templates (name, category, template_group)
            VALUES (?, ?, ?)
        """,
            defaults,
        )
    conn.commit()
    conn.close()


def create_user(name, email, password_hash, join_date, timezone):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users(name,email,password_hash,join_date,timezone)
        VALUES(?,?,?,?,?)
    """,
        (name, email, password_hash, join_date, timezone),
    )
    conn.commit()
    conn.close()


def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email=?", (email,))
    user = cur.fetchone()
    conn.close()
    return user


def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, stored_hash: str):
    return hash_password(password) == stored_hash


from datetime import datetime


def get_today_habits(user_id):
    conn = get_connection()
    cur = conn.cursor()
    today = datetime.now().date().isoformat()
    cur.execute(
        """
        SELECT * FROM habits
        WHERE user_id = ?
    """,
        (user_id,),
    )
    habits = cur.fetchall()
    today_habits = []
    for habit in habits:
        if habit["frequency"] == "daily":
            today_habits.append(dict(habit))
    conn.close()
    return today_habits


def create_habit(user_id, name, category, frequency, reminder, startDate):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO habits
        (user_id, habit_name, category, frequency, reminder_time, created_date, current_streak, best_streak)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    """,
        (user_id, name, category, frequency, reminder, startDate),
    )
    cur.execute("PRAGMA table_info(habits)")
    existing = [c[1] for c in cur.fetchall()]

    def add(col, sql):
        if col not in existing:
            print(f"[DB] Adding column: {col}")
            cur.execute(sql)

    add("consistency", "ALTER TABLE habits ADD COLUMN consistency REAL DEFAULT 0")
    add("active_days", "ALTER TABLE habits ADD COLUMN active_days INTEGER DEFAULT 0")
    conn.commit()
    conn.close()


def get_user_habits(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM habits WHERE user_id=?", (user_id,))
    habits = cur.fetchall()
    conn.close()
    return habits


def log_habit(habit_id, status):
    conn = get_connection()
    cur = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    cur.execute("DELETE FROM habit_logs WHERE habit_id=? AND date=?", (habit_id, today))
    cur.execute(
        "INSERT INTO habit_logs (habit_id, date, status) VALUES (?, ?, ?)",
        (habit_id, today, status),
    )
    conn.commit()
    conn.close()


def delete_habit(habit_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM habit_logs WHERE habit_id=?", (habit_id,))
    cur.execute("DELETE FROM habits WHERE id=?", (habit_id,))
    conn.commit()
    conn.close()


def get_daily_note(user_id, note_date):
    conn = get_connection()
    cur = conn.cursor()
    note = cur.execute(
        """
        SELECT content FROM daily_notes
        WHERE user_id=? AND note_date=?
    """,
        (user_id, note_date),
    ).fetchone()
    conn.close()
    return note["content"] if note else ""


def save_daily_note(user_id, note_date, content):
    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now().isoformat()
    cur.execute(
        """
        INSERT INTO daily_notes(user_id, note_date, content, created_at, updated_at)
        VALUES(?,?,?,?,?)
        ON CONFLICT(user_id, note_date)
        DO UPDATE SET
            content=excluded.content,
            updated_at=excluded.updated_at
    """,
        (user_id, note_date, content, now, now),
    )
    conn.commit()
    conn.close()


def add_activity(user_id, type, title, description=None, entity_id=None):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO activity_logs
        (user_id, type, title, description, entity_id, created_at, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    """,
        (user_id, type, title, description, entity_id, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()


def get_user_summary(user_id):
    conn = get_connection()
    cur = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    total_habits = cur.execute(
        "SELECT COUNT(*) as c FROM habits WHERE user_id=?", (user_id,)
    ).fetchone()["c"]
    completed_today = cur.execute(
        """
        SELECT COUNT(*) as c
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND habit_logs.date=? AND habit_logs.status='done'
        """,
        (user_id, today),
    ).fetchone()["c"]
    habits = cur.execute("SELECT id FROM habits WHERE user_id=?", (user_id,)).fetchall()
    from streaks import get_streaks

    max_current = 0
    max_best = 0
    for h in habits:
        s = get_streaks(conn, h["id"])
        max_current = max(max_current, s["current"])
        max_best = max(max_best, s["best"])
    completion_rate = int((completed_today / total_habits) * 100) if total_habits else 0
    unread = cur.execute(
        """
        SELECT COUNT(*) as c
        FROM activity_logs
        WHERE user_id=? AND is_read=0
        """,
        (user_id,),
    ).fetchone()["c"]
    conn.close()
    return {
        "total_habits": total_habits,
        "completed_today": completed_today,
        "current_streak": max_current,
        "best_streak": max_best,
        "completion_rate": completion_rate,
        "unread_notifications": unread,
    }
