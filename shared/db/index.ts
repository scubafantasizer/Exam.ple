import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

// ── Schema ────────────────────────────────────────────────

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  geminiApiKey: text("gemini_api_key"),
  userName: text("user_name"),
  studyGoal: text("study_goal"),
  dailyStudyMinutes: integer("daily_study_minutes").notNull().default(60),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const topicsTable = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  subject: text("subject"),
  progress: integer("progress").notNull().default(0),
  status: text("status", { enum: ["not_started", "in_progress", "completed"] }).notNull().default("not_started"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const resourcesTable = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  type: text("type", { enum: ["video", "playlist"] }).notNull().default("video"),
  thumbnailUrl: text("thumbnail_url"),
  videoId: text("video_id"),
  topicId: integer("topic_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const chatSessionsTable = sqliteTable("chat_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  topicId: integer("topic_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const chatMessagesTable = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  role: text("role", { enum: ["user", "model"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const wrongAnswersTable = sqliteTable("wrong_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionText: text("question_text").notNull(),
  type: text("type", { enum: ["wrong", "blank"] }).notNull().default("wrong"),
  topicId: integer("topic_id"),
  examId: integer("exam_id"),
  notes: text("notes"),
  isCorrected: integer("is_corrected", { mode: "boolean" }).notNull().default(false),
  correctedAt: integer("corrected_at", { mode: "timestamp" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const examsTable = sqliteTable("exams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  publisher: text("publisher"),
  topicId: integer("topic_id"),
  totalQuestions: integer("total_questions").notNull().default(0),
  pdfBase64: text("pdf_base64"),
  analysisResult: text("analysis_result"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const examQuestionsTable = sqliteTable("exam_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examId: integer("exam_id").notNull(),
  questionNumber: integer("question_number").notNull(),
  status: text("status", { enum: ["correct", "wrong", "blank"] }).notNull().default("correct"),
  notes: text("notes"),
});

export const notesTable = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  type: text("type", { enum: ["note", "list", "checklist", "table", "schedule"] }).notNull().default("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ── DB connection ─────────────────────────────────────────

const dbPath = process.env["DB_PATH"] ?? path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/yazici.db"
);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

// ── Auto-migration (CREATE TABLE IF NOT EXISTS) ───────────

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gemini_api_key TEXT,
    user_name TEXT,
    study_goal TEXT,
    daily_study_minutes INTEGER NOT NULL DEFAULT 60,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'not_started',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'video',
    thumbnail_url TEXT,
    video_id TEXT,
    topic_id INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    topic_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS wrong_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'wrong',
    topic_id INTEGER,
    exam_id INTEGER,
    notes TEXT,
    is_corrected INTEGER NOT NULL DEFAULT 0,
    corrected_at INTEGER,
    last_seen_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    publisher TEXT,
    topic_id INTEGER,
    total_questions INTEGER NOT NULL DEFAULT 0,
    pdf_base64 TEXT,
    analysis_result TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS exam_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'correct',
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'note',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
