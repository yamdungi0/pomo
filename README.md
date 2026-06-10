# 🍅 POMO

**POMO** is a web-based study service built on the Pomodoro Technique.  
Focus for 25 minutes, rest for 5 minutes, and track your progress — one POMO at a time.

---

## Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Markup    | HTML5                              |
| Style     | CSS3 (Grid, Flexbox, Animations)   |
| Logic     | Vanilla JavaScript (ES6+)          |
| Storage   | localStorage (browser)             |
| Backend   | None — frontend-only demo          |

---

## How to Run

No build step required. Just open the file in a browser:

```
pomo/index.html
```

Or serve with any static server:

```bash
# Python
python -m http.server 5500

# VS Code
Use the "Live Server" extension → right-click index.html → Open with Live Server
```

---

## Folder Structure

```
pomo/
├── index.html                  # Single-page app entry point
├── css/
│   └── style.css               # All styles
├── js/
│   └── script.js               # All JavaScript logic
├── assets/
│   ├── images/
│   │   ├── logo/               # logo.png, favicon.png
│   │   ├── backgrounds/        # study-bg-1~4.png, rest-bg-1~4.png
│   │   ├── icons/              # UI icon images
│   │   ├── characters/         # study-scene-1~4.png, rest-scene-1~4.png
│   │   └── tasks/              # Task-related images
│   └── music/
│       ├── study/              # study-1~4.mp3
│       └── rest/               # rest-1~4.mp3
└── README.md
```

---

## localStorage Keys

| Key                  | Type     | Description                                 |
|----------------------|----------|---------------------------------------------|
| `pomo_users`         | Object   | Registered users (demo only, not secure)    |
| `pomo_current_user`  | String   | Currently logged-in username                |
| `pomo_tasks`         | Array    | All study tasks                             |
| `pomo_active_task_id`| String   | ID of the currently active task             |
| `pomo_records`       | Object   | Daily POMO completion records               |
| `pomo_settings`      | Object   | User settings (reserved for future use)     |

### Record Structure

```json
{
  "2026-06-10": {
    "completedPomos": 5,
    "focusMinutes": 125
  }
}
```

### Task Structure

```json
{
  "id": "task-1234567890-1234",
  "title": "TOEFL Reading",
  "targetPomos": 3,
  "completedPomos": 0,
  "createdAt": "2026-06-10T10:00:00.000Z",
  "status": "active"
}
```

---

## Main Features

### Study Timer
- 25-minute countdown timer
- Play / Pause / Resume
- 4 switchable themes (background + scene image + music)
- Theme change does NOT reset the timer

### Task Desk
- Create tasks with a custom name and target POMO count (1–4)
- Click a task card to set it as the active task
- Delete tasks via the ✕ button
- Completed tasks are visually marked

### Rest Timer
- 5-minute rest countdown
- 4 switchable rest themes
- Triggered automatically after a Study POMO is completed

### Record Page
- Daily POMO calendar (click any date to view records)
- Level system based on total accumulated POMOs
- Speech bubble message changes with level

### Level System

| Total POMOs | Level            |
|-------------|------------------|
| 0 – 4       | Lv. Rookie        |
| 5 – 14      | Lv. POMO Starter  |
| 15 – 29     | Lv. POMO Eater    |
| 30 – 59     | Lv. Focus Tomato  |
| 60 – 99     | Lv. POMO Lover    |
| 100+        | Lv. POMO Master   |

---

## Adding Assets (Figma Exports)

1. **Backgrounds** → `assets/images/backgrounds/`
   - Study: `study-bg-1.png` ~ `study-bg-4.png`
   - Rest:  `rest-bg-1.png`  ~ `rest-bg-4.png`

2. **Characters / Scenes** → `assets/images/characters/`
   - Study: `study-scene-1.png` ~ `study-scene-4.png`
   - Rest:  `rest-scene-1.png`  ~ `rest-scene-4.png`

3. **Logo** → `assets/images/logo/`
   - `logo.png`, `favicon.png`

4. **Music** → `assets/music/study/` and `assets/music/rest/`
   - Study: `study-1.mp3` ~ `study-4.mp3`
   - Rest:  `rest-1.mp3`  ~ `rest-4.mp3`

File names are already referenced in `js/script.js` inside the `STUDY_THEMES` and `REST_THEMES` arrays.  
Just drop the files in the correct folder and they will load automatically.

---

## Notes

- **Frontend-only demo** — no backend, no database, no API calls.
- **Login/signup is localStorage demo only** — passwords are stored in plain text in the browser. This is intentional for a classroom demo and should never be used in production.
- **Assets are stored in the `assets/` folder** — images and music can be replaced by dropping new files in.
- Music autoplay requires a user interaction first (browser policy). Clicking the LP player or play button counts as a valid interaction.
- Refreshing the page resets timers, but all tasks and records persist in localStorage.

---

## Author

Developed as a class project.  
Service name: **POMO** — Pomodoro Study Service
