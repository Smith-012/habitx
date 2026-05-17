from database import (
    init_db,
    get_user_by_email,
    create_user,
    hash_password,
    verify_password,
    create_habit,
    get_user_habits,
    get_today_habits,
    log_habit,
    get_connection,
)
from database import get_user_summary
from database import add_activity
from database import get_daily_note, save_daily_note
from streaks import get_streaks
from streaks import get_history, get_history_range
from datetime import datetime
from progress import update_progress
from records import get_personal_records
from achievements import get_user_achievements
from flask import Flask, jsonify, request, render_template, session
from flask_cors import CORS
from collections import defaultdict
from datetime import date, timedelta
from itsdangerous import URLSafeTimedSerializer
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
app = Flask(
    __name__,
    template_folder=FRONTEND_DIR,
    static_folder=FRONTEND_DIR,
    static_url_path="",
)

# Dynamically set frontend URL (important for Vercel CORS)
frontend_url = os.environ.get("FRONTEND_URL", "http://127.0.0.1:5500") # Replace with your Vercel URL later

CORS(app, supports_credentials=True, origins=[frontend_url, "http://127.0.0.1:5000", "http://localhost:5000"])

# Secure the secret key
app.secret_key = os.environ.get("SECRET_KEY", "habitx-super-secret-key-999")

# Cross-domain cookie settings (required when frontend and backend are on different domains)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True

init_db()

# Token-based auth (works across different domains unlike cookies)
token_serializer = URLSafeTimedSerializer(app.secret_key)

def generate_token(user_id):
    return token_serializer.dumps({'user_id': user_id})

def verify_token(token):
    try:
        data = token_serializer.loads(token, max_age=86400 * 30)  # 30 days
        return data.get('user_id')
    except:
        return None

def get_auth_user_id():
    """Get user_id from Authorization header (token) or session (local dev)"""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:]
        return verify_token(token)
    return session.get("user_id")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"success": False, "message": "All fields required"})

    import re
    if not re.match(r'^[a-zA-Z\s]+$', name):
        return jsonify({"success": False, "message": "Name can only contain letters and spaces"})
    if len(name) > 20:
        return jsonify({"success": False, "message": "Name must be 20 characters or less"})
    if not email.endswith('@gmail.com'):
        return jsonify({"success": False, "message": "Email must end with @gmail.com"})
    if len(email) > 25:
        return jsonify({"success": False, "message": "Email must be 25 characters or less"})
    if len(password) < 8 or len(password) > 20:
        return jsonify({"success": False, "message": "Password must be 8-20 characters"})
    if not re.search(r'[A-Z]', password):
        return jsonify({"success": False, "message": "Password needs an uppercase letter"})
    if not re.search(r'[a-z]', password):
        return jsonify({"success": False, "message": "Password needs a lowercase letter"})
    if not re.search(r'\d', password):
        return jsonify({"success": False, "message": "Password needs a number"})
    if not re.search(r'[@$!%*?&]', password):
        return jsonify({"success": False, "message": "Password needs a special character (@$!%*?&)"})

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"success": False, "message": "Email already registered"})
    create_user(
        name=name,
        email=email,
        password_hash=hash_password(password),
        join_date=str(datetime.now()),
        timezone="Asia/Kolkata",
    )
    return jsonify({"success": True, "message": "Account created successfully"})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    user = get_user_by_email(email)
    if not user:
        return jsonify({"success": False, "message": "User not found"})
    if not verify_password(password, user["password_hash"]):
        return jsonify({"error": True, "message": "Wrong password"})
    
    session["user_id"] = user["id"]
    token = generate_token(user["id"])
    return jsonify(
        {
            "success": True,
            "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }
    )


@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"success": True})


@app.route("/api/verify-email", methods=["POST"])
def verify_email():
    data = request.json
    email = data.get("email")
    from database import get_user_by_email

    user = get_user_by_email(email)
    if user:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Email not found"}), 404


@app.route("/api/check-email-exists", methods=["POST"])
def check_email_exists():
    data = request.json
    email = data.get("email")
    from database import get_user_by_email
    user = get_user_by_email(email)
    return jsonify({"exists": user is not None})


@app.route("/api/reset-password", methods=["POST"])
def reset_password_route():
    data = request.get_json()
    email = data.get("email")
    new_password = data.get("password")

    from database import get_user_by_email, get_connection, hash_password, verify_password

    user = get_user_by_email(email)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # Check if new password is same as current one
    if verify_password(new_password, user["password_hash"]):
        return jsonify({"success": False, "message": "New password cannot be the same as old password"}), 400

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET password_hash=? WHERE id=?",
        (hash_password(new_password), user["id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Password changed successfully"})


@app.route("/api/habits", methods=["POST"])
def add_habit():
    user_id = get_auth_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Login required"}), 401
        
    data = request.get_json()
    try:
        create_habit(
            user_id,
            data["name"],
            data["category"],
            data["frequency"],
            data["reminder"],
            data["startDate"],
        )
        add_activity(
            user_id=user_id,
            type="habit_created",
            title="Habit Created",
            description=f'Habit "{data["name"]}" was created',
        )
        return jsonify({"success": True, "message": "Habit created"})
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"success": False, "message": "Database error"})


@app.route("/api/habits/<int:user_id>", methods=["GET"])
def get_habits(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    cur = conn.cursor()
    habits = get_user_habits(user_id)
    today = datetime.now().strftime("%Y-%m-%d")
    formatted = []
    for h in habits:
        cur.execute(
            "SELECT status FROM habit_logs WHERE habit_id=? AND date=?",
            (h["id"], today),
        )
        log = cur.fetchone()
        streak = get_streaks(conn, h["id"])
        formatted.append(
            {
                "id": h["id"],
                "user_id": h["user_id"],
                "habit_name": h["habit_name"],
                "category": h["category"],
                "frequency": h["frequency"],
                "reminder_time": h["reminder_time"],
                "created_date": h["created_date"],
                "current_streak": streak["current"],
                "best_streak": streak["best"],
                "consistency": h["consistency"],
                "active_days": h["active_days"],
                "today_status": log["status"] if log else None,
            }
        )
    conn.close()
    return jsonify({"success": True, "habits": formatted})


@app.route("/api/habit/<int:habit_id>/history")
def habit_history(habit_id):
    conn = get_connection()
    from_date = request.args.get("from")
    to_date = request.args.get("to")
    if from_date is not None and to_date is not None:
        history = get_history_range(conn, habit_id, from_date, to_date)
        return jsonify(history)
    days = request.args.get("days", type=int)
    if days is None:
        days = 30
    history = get_history(conn, habit_id, days)
    return jsonify(history)


@app.route("/api/user/<int:user_id>/weekly")
def weekly_progress(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    cur = conn.cursor()
    habits = cur.execute(
        "SELECT id, created_date FROM habits WHERE user_id=?", (user_id,)
    ).fetchall()
    today = date.today()
    result = {}
    for i in range(7):
        d = today - timedelta(days=6 - i)
        day_str = d.strftime("%Y-%m-%d")
        total = 0
        done = 0
        for h in habits:
            start = datetime.strptime(h["created_date"], "%Y-%m-%d").date()
            if d < start:
                continue
            total += 1
            row = cur.execute(
                "SELECT status FROM habit_logs WHERE habit_id=? AND date=?",
                (h["id"], day_str),
            ).fetchone()
            if row and row["status"] == "done":
                done += 1
        percent = int((done / total) * 100) if total else 0
        result[d.strftime("%a")] = percent
    return jsonify(result)


@app.route("/api/habits/today/<int:user_id>")
def today_habits(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    habits = get_today_habits(user_id)
    return jsonify(habits)


@app.route("/api/habits/<int:habit_id>/check", methods=["POST"])
def check_habit(habit_id):
    user_id = get_auth_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Login required"}), 401

    conn = get_connection()
    habit = conn.execute(
        "SELECT user_id, habit_name FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    conn.close()

    if not habit or habit["user_id"] != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.get_json()
    status = data.get("status")
    if status not in ["done", "missed"]:
        return jsonify({"success": False, "message": "Invalid status"}), 400
    log_habit(habit_id, status)
    conn = get_connection()
    habit = conn.execute(
        "SELECT user_id, habit_name FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    conn.close()
    add_activity(
        user_id=habit["user_id"],
        type="habit_status",
        title="Habit Updated",
        description=f'Habit "{habit["habit_name"]}" marked {status.upper()}',
        entity_id=habit_id,
    )
    consistency = update_progress(habit_id)
    conn = get_connection()
    streak = get_streaks(conn, habit_id)
    conn.close()
    return jsonify(
        {
            "success": True,
            "message": "Habit updated",
            "streak": streak["current"],
            "best_streak": streak["best"],
            "consistency": consistency,
        }
    )


@app.route("/api/habits/<int:habit_id>", methods=["DELETE"])
def delete_habit_route(habit_id):
    user_id = get_auth_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Login required"}), 401

    from database import delete_habit

    conn = get_connection()
    habit = conn.execute(
        "SELECT user_id, habit_name FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    conn.close()
    
    if not habit or habit["user_id"] != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    delete_habit(habit_id)
    add_activity(
        user_id=habit["user_id"],
        type="habit_deleted",
        title="Habit Deleted",
        description=f'Habit "{habit["habit_name"]}" was deleted',
    )
    return jsonify({"success": True})


@app.route("/api/habits/<int:habit_id>", methods=["PUT"])
def update_habit(habit_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Login required"}), 401

    conn = get_connection()
    habit = conn.execute(
        "SELECT user_id FROM habits WHERE id=?", (habit_id,)
    ).fetchone()
    
    if not habit or habit["user_id"] != user_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.json
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE habits
        SET habit_name=?, category=?, frequency=?, reminder_time=?, created_date=?
        WHERE id=?
    """,
        (
            data["name"],
            data["category"],
            data["frequency"],
            data["reminder"],
            data["startDate"],
            habit_id,
        ),
    )
    conn.commit()
    conn.close()
    return {"success": True}


@app.route("/api/daily-note/<int:user_id>/<string:note_date>", methods=["GET"])
def api_get_daily_note(user_id, note_date):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    try:
        content = get_daily_note(user_id, note_date)
        return jsonify({"success": True, "content": content})
    except:
        return jsonify({"success": False}), 500


@app.route("/api/daily-note/<int:user_id>/<string:note_date>", methods=["POST"])
def api_save_daily_note(user_id, note_date):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    data = request.get_json()
    content = data.get("content", "")
    try:
        save_daily_note(user_id, note_date, content)
        return jsonify({"success": True})
    except Exception as e:
        print("NOTE SAVE ERROR:", e)
        return jsonify({"success": False}), 500


@app.route("/api/analytics/weekly/<int:user_id>")
def weekly_analytics(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT hl.date, COUNT(*) as total
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE h.user_id = ?
        AND hl.status = 'done'
        AND hl.date >= date('now','-6 days')
        GROUP BY hl.date
    """,
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    from datetime import datetime, timedelta

    today = datetime.today()
    week_map = {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
    for r in rows:
        day_name = datetime.strptime(r["date"], "%Y-%m-%d").strftime("%a")
        week_map[day_name] = r["total"]
    return jsonify({"success": True, "week": week_map})


@app.route("/api/insights/<int:user_id>")
def get_insights(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT strftime('%w', hl.date) as day, COUNT(*) as total
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE h.user_id = ? AND hl.status='done'
        GROUP BY day
    """,
        (user_id,),
    )
    rows = cur.fetchall()
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    counts = {days[int(r["day"])]: r["total"] for r in rows}
    if counts:
        best_day = max(counts, key=counts.get)
        worst_day = min(counts, key=counts.get)
    else:
        best_day = worst_day = None
    cur.execute(
        """
        SELECT habit_name, best_streak
        FROM habits
        WHERE user_id=?
        ORDER BY best_streak DESC
        LIMIT 1
    """,
        (user_id,),
    )
    habit = cur.fetchone()
    conn.close()
    return {
        "success": True,
        "best_day": best_day,
        "worst_day": worst_day,
        "top_habit": habit["habit_name"] if habit else None,
        "best_streak": habit["best_streak"] if habit else 0,
    }


@app.route("/api/achievements/<int:user_id>")
def achievements_api(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    data = get_user_achievements(user_id)
    return jsonify({"success": True, "achievements": data})


@app.route("/api/records/<int:user_id>")
def personal_records(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    return {"success": True, "records": get_personal_records(user_id)}


@app.route("/api/activity/<int:user_id>")
def get_activities(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT * FROM activity_logs
        WHERE user_id=?
        ORDER BY datetime(created_at) DESC
        LIMIT 50
    """,
        (user_id,),
    ).fetchall()
    conn.close()
    return jsonify({"success": True, "activities": [dict(r) for r in rows]})


@app.route("/api/activity/<int:user_id>/clear", methods=["DELETE"])
def clear_activities(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    conn.execute("DELETE FROM activity_logs WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/activity/<int:user_id>/read", methods=["POST"])
def mark_activity_read(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    conn.execute("UPDATE activity_logs SET is_read=1 WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/user/<int:user_id>/summary")
def user_summary(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    try:
        summary = get_user_summary(user_id)
        return jsonify({"success": True, "summary": summary})
    except Exception as e:
        print("Summary Error:", e)
        return jsonify({"success": False}), 500


@app.route("/api/templates")
def get_templates():
    conn = get_connection()
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT name, category, template_group
        FROM habit_templates
        ORDER BY template_group
    """
    ).fetchall()
    conn.close()
    templates = {}
    for r in rows:
        group = r["template_group"]
        if group not in templates:
            templates[group] = []
        templates[group].append({"name": r["name"], "category": r["category"]})
    return jsonify({"success": True, "templates": templates})


@app.route("/api/user/<int:user_id>/detailed-stats")
def detailed_stats(user_id):
    if get_auth_user_id() != user_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    conn = get_connection()
    cur = conn.cursor()
    days_active = cur.execute(
        """
        SELECT COUNT(DISTINCT date) as c
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND status='done'
    """,
        (user_id,),
    ).fetchone()["c"]
    total_completions = cur.execute(
        """
        SELECT COUNT(*) as c
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=? AND status='done'
    """,
        (user_id,),
    ).fetchone()["c"]
    total_logs = cur.execute(
        """
        SELECT COUNT(*) as c
        FROM habit_logs
        JOIN habits ON habits.id = habit_logs.habit_id
        WHERE habits.user_id=?
    """,
        (user_id,),
    ).fetchone()["c"]
    success_rate = round((total_completions / total_logs) * 100) if total_logs else 0
    achievements = get_user_achievements(user_id)
    conn.close()
    return jsonify(
        {
            "success": True,
            "days_active": days_active,
            "total_completions": total_completions,
            "success_rate": success_rate,
            "achievements_count": len(achievements),
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
