from database import get_connection
from datetime import date, datetime


def update_progress(habit_id):
    conn = get_connection()
    cur = conn.cursor()
    habit = cur.execute(
        "SELECT created_date FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    if not habit:
        return 0
    start_date = datetime.strptime(habit["created_date"], "%Y-%m-%d").date()
    today = date.today()
    active_days = (today - start_date).days + 1
    if active_days <= 0:
        active_days = 1
    done_days = cur.execute(
        """
        SELECT COUNT(*) as c
        FROM habit_logs
        WHERE habit_id=? AND status='done'
    """,
        (habit_id,),
    ).fetchone()["c"]
    consistency = round((done_days / active_days) * 100, 1)
    cur.execute(
        """
        UPDATE habits
        SET consistency=?, active_days=?
        WHERE id=?
    """,
        (consistency, active_days, habit_id),
    )
    conn.commit()
    conn.close()
    return consistency
