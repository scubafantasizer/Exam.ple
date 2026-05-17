import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Topic } from "../lib/types";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { cn, statusLabel, statusColor } from "../lib/utils";
import { useLang } from "../hooks/useLang";

export default function Topics() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<Topic["status"]>("not_started");

  const { data: topics = [] } = useQuery<Topic[]>({ queryKey: ["topics"], queryFn: () => api.get("/topics") });

  const create = useMutation({
    mutationFn: () => api.post("/topics", { name, subject: subject || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); setName(""); setSubject(""); },
  });

  const update = useMutation({
    mutationFn: (id: number) => api.patch(`/topics/${id}`, { progress: editProgress, status: editStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); setEditId(null); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/topics/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">{t("topics_title")}</h2>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 flex-wrap">
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t("topics_name_ph")}
          onKeyDown={e => e.key === "Enter" && name && create.mutate()}
          className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("topics_subject_ph")}
          className="w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <button onClick={() => name && create.mutate()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5">
          <Plus size={16} /> {t("add")}
        </button>
      </div>

      <div className="space-y-3">
        {topics.map(tp => (
          <div key={tp.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{tp.name}</span>
                  {tp.subject && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tp.subject}</span>}
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor(tp.status))}>
                    {statusLabel(tp.status, t)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${tp.progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{tp.progress}%</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditId(tp.id); setEditProgress(tp.progress); setEditStatus(tp.status); }}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600">
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => del.mutate(tp.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {editId === tp.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3 flex-wrap">
                <div className="flex-1 min-w-40">
                  <label className="text-xs text-gray-500 mb-1 block">{t("topics_progress")}: {editProgress}%</label>
                  <input type="range" min={0} max={100} value={editProgress} onChange={e => setEditProgress(Number(e.target.value))}
                    className="w-full accent-indigo-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("topics_status")}</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as Topic["status"])}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="not_started">{t("status_not_started")}</option>
                    <option value="in_progress">{t("status_in_progress")}</option>
                    <option value="completed">{t("status_completed")}</option>
                  </select>
                </div>
                <div className="flex gap-2 items-end">
                  <button onClick={() => update.mutate(tp.id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("save")}</button>
                  <button onClick={() => setEditId(null)}
                    className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">{t("cancel")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {topics.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{t("topics_empty")}</div>}
      </div>
    </div>
  );
}
