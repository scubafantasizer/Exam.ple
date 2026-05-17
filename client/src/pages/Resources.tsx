import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Resource, Topic } from "../lib/types";
import { Plus, Trash2, ExternalLink, PlaySquare, ListVideo } from "lucide-react";
import { fmtDate } from "../lib/utils";
import { useLang } from "../hooks/useLang";

export default function Resources() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState<number | "">("");

  const { data: resources = [] } = useQuery<Resource[]>({ queryKey: ["resources"], queryFn: () => api.get("/resources") });
  const { data: topics = [] } = useQuery<Topic[]>({ queryKey: ["topics"], queryFn: () => api.get("/topics") });

  const create = useMutation({
    mutationFn: () => api.post("/resources", { url, title, topicId: topicId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); setUrl(""); setTitle(""); setTopicId(""); setShowNew(false); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/resources/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  const grouped = topics.map(top => ({
    topic: top,
    items: resources.filter(r => r.topicId === top.id),
  })).filter(g => g.items.length > 0);

  const uncat = resources.filter(r => !r.topicId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{t("res_title")}</h2>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> {t("res_add")}
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t("res_url_ph")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <div className="flex gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("res_title_ph")}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={topicId} onChange={e => setTopicId(e.target.value ? parseInt(e.target.value) : "")}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">{t("res_topic_ph")}</option>
              {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => url && title && create.mutate()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("add")}</button>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">{t("cancel")}</button>
          </div>
        </div>
      )}

      {[...grouped.map(g => ({ label: g.topic.name, items: g.items })), ...(uncat.length ? [{ label: "—", items: uncat }] : [])].map(group => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
                {r.thumbnailUrl ? (
                  <img src={r.thumbnailUrl} alt={r.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center text-gray-300">
                    {r.type === "playlist" ? <ListVideo size={32} /> : <PlaySquare size={32} />}
                  </div>
                )}
                <div className="p-3 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 line-clamp-2">{r.title}</span>
                    <div className="flex gap-1 shrink-0">
                      <a href={r.url} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                        <ExternalLink size={14} />
                      </a>
                      <button onClick={() => del.mutate(r.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {r.type === "playlist" ? t("res_playlist") : t("res_video")}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {resources.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{t("res_empty")}</div>}
    </div>
  );
}
