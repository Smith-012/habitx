# Smart Habit Builder

A full-stack habit tracking application with Flask backend and vanilla JavaScript frontend.

## Project Structure

```
Smart habit/
├── frontend/           # Client-side code (UI, assets)
│   ├── .vscode/        # editor settings
│   ├── api.js          # frontend API helper (calls backend)
│   ├── app.js          # Frontend JavaScript (uses localStorage currently)
│   ├── index.html      # Main frontend HTML
│   ├── styles.css      # Frontend stylesheet
│   ├── static/         # frontend static assets (images, etc.)
│   └── templates/      # (optional templates used by frontend)
├── backend/            # Flask backend (Python)
│   ├── app.py          # Flask application and API endpoints
│   ├── database.py     # simple DB/persistence helper (SQLite planned)
│   └── requirements.txt# Python dependencies
└── README.md           # This file
```

## How to run & Setup

1. Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Start the Flask server from the `backend` folder:

```bash
python app.py
```

3. Open the app in your browser:

```
http://localhost:5000
```

Notes:

- The frontend files live in `frontend/`. The Flask server serves the UI and provides API endpoints.
