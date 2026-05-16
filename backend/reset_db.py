import os
from database import init_db, DB_PATH

def reset_database():
    print("🚀 Starting Database Reset...")
    
    # 1. Delete the existing database file if it exists
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print(f"✅ Deleted old database at: {DB_PATH}")
        except PermissionError:
            print("❌ ERROR: Could not delete database. Make sure the Flask server is STOPPED.")
            return
    else:
        print("ℹ️ No existing database file found. Creating a new one.")

    # 2. Re-initialize the database using the new schema (with CHECK constraints)
    try:
        init_db()
        print("✅ New database initialized with secure schema (Name <= 20, Email <= 25).")
        print("✅ Default habit templates re-populated.")
    except Exception as e:
        print(f"❌ ERROR during initialization: {e}")
        return

    print("\n✨ Database Reset Successful! You can now restart your server.")

if __name__ == "__main__":
    reset_database()
