import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Note } from "../lib/types";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { cn, fmtDate } from "../lib/utils";
import { useLang } from "../hooks/useLang";
import ReactMarkdown from "react-markdown";

type NoteType = "note" | "list" | "table" | "schedule";

const typeIcon: Record<NoteType, string> = {
  note: "📝", list: "📋", table: "📊", schedule: "📅",
};

export default function Notes() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("note");
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [preview, setPreview] = useState<number | null>(null);

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => api.get("/notes"),
  });

  const create = useMutation({
    mutationFn: () => api.post("/notes", { title, content, type }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setTitle(""); setContent(""); setShowNew(false); },
  });

  const update = useMutation({
    mutationFn: (id: number) => api.patch(`/notes/${id}`, { title: editTitle, content: editContent }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setEditId(null); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const typeOptions: NoteType[] = ["note", "list", "table", "schedule"];
  const typeLabels: Record<NoteType, string> = {
    note: t("notes_type_note"), list: t("notes_type_list"),
    table: t("notes_type_table"), schedule: t("notes_type_schedule"),
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{t("notes_title")}</h2>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> {t("notes_new")}
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("notes_title_ph")}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={type} onChange={e => setType(e.target.value as NoteType)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {typeOptions.map(tp => <option key={tp} value={tp}>{typeIcon[tp]} {typeLabels[tp]}</option>)}
            </select>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={t("notes_content_ph")} rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y" />
          <div className="flex gap-2">
            <button onClick={() => title && create.mutate()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("create")}</button>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.map(note => (
          <div key={note.id} className="bg-white rounded-xl border border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-50 flex items-center gap-2">
              <span className="text-base">{typeIcon[note.type as NoteType] ?? "📝"}</span>
              {editId === note.id ? (
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              ) : (
                <span className="flex-1 font-semibold text-gray-800 text-sm truncate">{note.title}</span>
              )}
              <div className="flex gap-1 shrink-0">
                {editId === note.id ? (
                  <>
                    <button onClick={() => update.mutate(note.id)} className="p-1.5 rounded hover:bg-green-50 text-green-500"><Check size={14} /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-gray-50 text-gray-400"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setPreview(preview === note.id ? null : note.id)}
                      className={cn("p-1.5 rounded text-xs font-medium", preview === note.id ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-50 text-gray-400")}>
                      {preview === note.id ? "Raw" : "Preview"}
                    </button>
                    <button onClick={() => { setEditId(note.id); setEditTitle(note.title); setEditContent(note.content); }}
                      className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><Pencil size={14} /></button>
                    <button onClick={() => del.mutate(note.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto max-h-64">
              {editId === note.id ? (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              ) : preview === note.id ? (
                <div className="prose prose-sm max-w-none text-gray-700 overflow-x-auto">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              ) : (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{note.content}</pre>
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">{fmtDate(note.updatedAt)}</div>
          </div>
        ))}
      </div>
      {notes.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{t("notes_empty")}</div>}
    </div>
  );
}
