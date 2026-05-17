# exam.ple — AI Study Coach

A local-first, AI-powered study management app for students preparing for exams. Built with Node.js, React, SQLite, and Google Gemini.

---

## Features

| Feature | Description |
|---|---|
| **AI Agent** | A Gemini-powered agent that can add topics, create notes, log mistakes, and analyze your study status — all by chat |
| **Topics** | Track subjects with progress bars and completion status |
| **Exams** | Log practice tests, mark each question correct/wrong/blank, and get AI analysis of your weaknesses |
| **Mistakes** | Track wrong and blank answers, add notes, mark as corrected |
| **Notes & Lists** | Markdown notes, tables, schedules, and lists — can be created by the AI automatically |
| **Chat** | Conversational AI tutoring, tied to specific topics |
| **Resources** | Save YouTube videos and playlists, organized by topic |
| **Bilingual** | Full Turkish and English UI — toggle in Settings or sidebar |

---

## Requirements

- **Node.js 18 or higher** (Node 20 LTS recommended; Node 26 works)
- A free **Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Linux, macOS, or WSL

> The start script automatically installs Node.js if it's missing, and handles all distros (Debian/Ubuntu/Zorin/Pardus, Fedora/Nobara, Arch/Manjaro/NyArch/Garuda, openSUSE, Void, Alpine, and more).

---

## Quick Start

```bash
# 1. Extract the zip
unzip exam.ple.zip
cd exam.ple

# 2. Make the start script executable (only needed once)
chmod +x scripts/start.sh

# 3. Run
./scripts/start.sh
```

The first run installs dependencies and builds the app (~1 minute). Subsequent starts are instant.

The app opens automatically in your browser at **http://localhost:3001**.

---

## First-Time Setup

1. Open **Settings** (sidebar → Settings)
2. Enter your **Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey)
3. Optionally set your name and study goal
4. Go to **AI Agent** and start chatting — it can set everything else up for you

---

## Project Structure

```
exam.ple/
├── scripts/
│   └── start.sh          # Cross-distro launcher
├── server/               # Express + TypeScript backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── lib/          # Logger, helpers
│   │   └── ai-skills.md  # AI agent system prompt
│   └── build.mjs         # esbuild config
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/        # One file per page
│   │   ├── components/   # Shared UI (Layout)
│   │   ├── hooks/        # useLang
│   │   └── lib/          # api.ts, i18n.ts, types.ts, utils.ts
│   └── vite.config.ts
├── shared/
│   ├── db/               # Drizzle ORM schema + DB connection
│   └── api-zod/          # Zod schemas shared by server & client types
└── data/
    └── exam-ple.db       # SQLite database (auto-created)
```

---

## API Overview

All endpoints are under `/api`:

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/summary` | Stats overview |
| GET/POST/PATCH/DELETE | `/topics` | Topic CRUD |
| GET/POST/DELETE | `/resources` | YouTube resource CRUD |
| GET/POST/PATCH/DELETE | `/notes` | Notes/lists CRUD |
| GET/POST/PATCH/DELETE | `/wrong-answers` | Mistake tracker |
| GET/POST/DELETE | `/exams` | Exam CRUD |
| GET | `/exams/:id` | Exam with questions |
| PUT | `/exams/:id/questions` | Save question results |
| POST | `/exams/:id/analyze` | AI analysis of exam |
| GET/POST | `/chat/sessions` | Chat session CRUD |
| GET/POST | `/chat/sessions/:id/messages` | Messages + AI reply |
| POST | `/ai/chat` | Stateless AI chat |
| POST | `/ai/agent` | AI agent with function calling |
| GET/PUT | `/settings` | App settings |

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Drizzle ORM, better-sqlite3, Pino
- **Frontend**: React 18, Vite, Tailwind CSS v4, TanStack Query, Wouter, react-markdown
- **AI**: Google Gemini 2.0 Flash (via `@google/generative-ai`)
- **Database**: SQLite (file-based, no server needed)
- **Build**: esbuild (server), Vite (client)

---

## Language

The UI is fully bilingual. Toggle between **Turkish** and **English** at the bottom of the sidebar or in Settings. The AI Agent and Chat responses are always in Turkish (this is controlled by the server-side system prompt — edit `server/src/routes/ai-chat.ts` and `ai-agent.ts` to change).

---

## Troubleshooting

**"Gemini API key not set"** — Go to Settings and paste your API key from [aistudio.google.com](https://aistudio.google.com/app/apikey).

**Port 3001 already in use** — Kill whatever is using it: `lsof -ti:3001 | xargs kill`

**Node version error** — Run `node -v`. If below 18, update Node from [nodejs.org](https://nodejs.org) or use your distro's package manager.

**Clean reinstall** — Delete `server/node_modules`, `client/node_modules`, `server/dist`, and `client/dist`, then run `./scripts/start.sh` again.
