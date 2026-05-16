# exam.ple

A fully AI-driven local study coach. No cloud, no subscriptions, no waiting.

Everything runs on your machine. Your data never leaves. Open your browser and it works like an app.

---

## What it does

- **AI agent** that tracks your topics, logs wrong answers, builds gap analyses, and creates study notes — automatically, without being asked
- **Exam tracker** — upload a PDF or enter question results; AI analyzes your performance
- **Topic progress** — track study progress per subject with a slider
- **Wrong answer log** — auto-corrects stale entries after 14 days
- **Notes & lists** — AI creates and saves Markdown notes directly to your notebook
- **YouTube resource organizer** — link videos and playlists to topics
- **Multi-session chat** — persistent topic-based chat sessions with full history

The AI is powered by **Google Gemini 2.0 Flash** via your own API key.

---

## Requirements

- **Node.js 18+** — [nodejs.org](https://nodejs.org) (LTS version)
- A free **Gemini API key** — [aistudio.google.com](https://aistudio.google.com/app/apikey)

---

## Getting started

### Windows

Double-click `scripts/start.bat`  
(or run it from the terminal)

### macOS / Linux

```bash
bash scripts/start.sh
```

The first run installs dependencies and builds the app. This takes about 1–2 minutes. After that, it starts in seconds.

Your browser will open automatically at **http://localhost:3001**.

---

## First use

1. Go to **Settings** and enter your Gemini API key
2. Optionally set your name and study goal
3. Start chatting with the AI agent — it will build your topic list, track errors, and create plans

---

## Project structure

```
exam.ple/
├── scripts/
│   ├── start.bat          ← Windows launcher
│   └── start.sh           ← macOS/Linux launcher
├── server/
│   ├── src/
│   │   ├── routes/        ← Express API routes
│   │   ├── lib/           ← Logger
│   │   ├── ai-skills.md   ← AI agent instructions
│   │   ├── app.ts
│   │   └── index.ts
│   ├── build.mjs
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/         ← React pages
│   │   ├── components/    ← UI components
│   │   ├── hooks/
│   │   └── lib/
│   └── package.json
├── shared/
│   ├── db/                ← SQLite schema + Drizzle ORM
│   ├── api-zod/           ← Zod validation schemas
│   └── api-client/        ← Typed React Query hooks
└── data/
    └── exam-ple.db        ← Created automatically on first run
```

---

## How it works

```
start.bat / start.sh
       │
       ▼
  Local server (Express · Node.js · port 3001)
       │
       ├─── React frontend   (served statically)
       ├─── SQLite database  (data/ — your machine only)
       └─── AI agent         (Gemini API — your key, your requests)
```

The server builds once. After that, `start.bat`/`start.sh` launches it in under a second. No Electron, no installer, no `.exe` to trust — just Node serving a local web app in your browser.

---

## Development

To work on the code with hot-reload:

```bash
# Terminal 1 — API server with auto-restart
npm run dev --prefix server

# Terminal 2 — React frontend with HMR
npm run dev --prefix client
```

The client dev server runs on port 5173 and proxies `/api` to the server on port 3001.

---

## Tech stack

| Layer | Technology |
|---|---|
| AI | Google Gemini 2.0 Flash |
| Backend | Express 5, TypeScript, TSX |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Frontend | React 18, Vite, Tailwind CSS v4 |
| UI components | shadcn/ui (Radix UI) |
| Routing | Wouter |
| Data fetching | TanStack Query |
| Validation | Zod |

---

## Privacy

All data is stored in `data/exam-ple.db` on your machine. The only external network call is to the Gemini API (using your own key). Nothing is sent to any server except Google's AI API.
