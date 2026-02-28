from datetime import date, timedelta, datetime


def get_logs_for_habit(conn, habit_id):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT date, status
        FROM habit_logs
        WHERE habit_id = ?
        ORDER BY date DESC
    """,
        (habit_id,),
    )
    return cur.fetchall()


def calculate_current_streak(logs, start_date):
    logs_map = {row["date"]: row["status"] for row in logs}
    today = date.today()
    streak = 0
    check_day = today
    while check_day >= start_date:
        d = check_day.strftime("%Y-%m-%d")
        if logs_map.get(d) == "done":
            streak += 1
        else:
            break
        check_day -= timedelta(days=1)
    return streak


def calculate_longest_streak(logs):
    if not logs:
        return 0
    logs_sorted = sorted(logs, key=lambda r: r["date"])
    longest = 0
    current = 0
    prev_date = None
    for row in logs_sorted:
        d = datetime.strptime(row["date"], "%Y-%m-%d").date()
        if row["status"] != "done":
            current = 0
            prev_date = None
            continue
        if prev_date and d == prev_date + timedelta(days=1):
            current += 1
        else:
            current = 1
        longest = max(longest, current)
        prev_date = d
    return longest


def get_streaks(conn, habit_id):
    logs = get_logs_for_habit(conn, habit_id)
    habit = conn.execute(
        "SELECT created_date FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    start_date = datetime.strptime(habit["created_date"], "%Y-%m-%d").date()
    return {
        "current": calculate_current_streak(logs, start_date),
        "best": calculate_longest_streak(logs),
    }


def get_history(conn, habit_id, days=30):
    cur = conn.cursor()
    logs = cur.execute(
        "SELECT date, status FROM habit_logs WHERE habit_id=?", (habit_id,)
    ).fetchall()
    logs_map = {r["date"]: r["status"] for r in logs}
    today = date.today()
    history = {}
    for i in range(days):
        d = today - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        history[key] = logs_map.get(key, None)
    return history


def get_history_range(conn, habit_id, from_date, to_date):
    cur = conn.cursor()
    habit = cur.execute(
        "SELECT created_date FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    if not habit:
        return {}
    created = datetime.strptime(habit["created_date"], "%Y-%m-%d").date()
    logs = cur.execute(
        "SELECT date, status FROM habit_logs WHERE habit_id=?", (habit_id,)
    ).fetchall()
    logs_map = {r["date"]: r["status"] for r in logs}
    start = datetime.strptime(from_date, "%Y-%m-%d").date()
    end = datetime.strptime(to_date, "%Y-%m-%d").date()
    history = {}
    d = start
    while d <= end:
        key = d.strftime("%Y-%m-%d")
        if d < created:
            history[key] = None
        else:
            history[key] = logs_map.get(key, "missed")
        d += timedelta(days=1)
    return history
