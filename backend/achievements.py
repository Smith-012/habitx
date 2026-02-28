from database import get_connection
from streaks import get_streaks
from datetime import date, timedelta


def get_user_achievements(user_id):
    conn = get_connection()
    cur = conn.cursor()
    achievements = []
    total_habits = cur.execute(
        "SELECT COUNT(*) as c FROM habits WHERE user_id=?", (user_id,)
    ).fetchone()["c"]
    if total_habits >= 1:
        achievements.append("first_habit")
    if total_habits >= 5:
        achievements.append("habits_5")
    if total_habits >= 10:
        achievements.append("habits_10")
    habits = cur.execute("SELECT id FROM habits WHERE user_id=?", (user_id,)).fetchall()
    best_streak = 0
    for h in habits:
        s = get_streaks(conn, h["id"])
        best_streak = max(best_streak, s["best"])
    if best_streak >= 3:
        achievements.append("streak_3")
    if best_streak >= 7:
        achievements.append("streak_7")
    if best_streak >= 21:
        achievements.append("streak_21")
    if best_streak >= 30:
        achievements.append("streak_30")
    if best_streak >= 100:
        achievements.append("streak_100")
    today = date.today()
    week_ago = today - timedelta(days=6)
    logs = cur.execute(
        """
        SELECT status FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND date BETWEEN ? AND ?
    """,
        (user_id, week_ago.isoformat(), today.isoformat()),
    ).fetchall()
    if logs and all(l["status"] == "done" for l in logs):
        achievements.append("perfect_week")
    conn.close()
    return achievements
