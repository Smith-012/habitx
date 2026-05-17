from database import get_connection
from streaks import get_streaks
from datetime import date, timedelta


def get_personal_records(user_id):
    conn = get_connection()
    cur = conn.cursor()
    habits = cur.execute(
        "SELECT id, habit_name FROM habits WHERE user_id=?", (user_id,)
    ).fetchall()
    longest_streak = 0
    best_habit = None
    for h in habits:
        s = get_streaks(conn, h["id"])
        if s["best"] > longest_streak:
            longest_streak = s["best"]
            best_habit = h["habit_name"]
    best_day = cur.execute(
        """
        SELECT date, COUNT(*) as total
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND status='done'
        GROUP BY date
        ORDER BY total DESC
        LIMIT 1
    """,
        (user_id,),
    ).fetchone()
    best_day_count = best_day["total"] if best_day else 0
    today = date.today()
    week_ago = today - timedelta(days=6)
    week_total = cur.execute(
        """
        SELECT COUNT(*) as total
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND status='done'
        AND date BETWEEN ? AND ?
    """,
        (user_id, week_ago.isoformat(), today.isoformat()),
    ).fetchone()["total"]
    total_possible = len(habits) * 7 if habits else 1
    best_week_percent = round((week_total / total_possible) * 100)
    consistent = cur.execute(
        """
        SELECT habit_name, COUNT(*) as total
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND status='done'
        GROUP BY habits.habit_name, habit_logs.habit_id
        ORDER BY total DESC
        LIMIT 1
    """,
        (user_id,),
    ).fetchone()
    consistent_habit = consistent["habit_name"] if consistent else None
    conn.close()
    return {
        "longest_streak": longest_streak,
        "best_habit": best_habit,
        "best_day_count": best_day_count,
        "best_week_percent": best_week_percent,
        "consistent_habit": consistent_habit,
    }
