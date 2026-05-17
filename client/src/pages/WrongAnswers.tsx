import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { WrongAnswer, Topic } from "../lib/types";
import { Plus, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn, fmtDate } from "../lib/utils";
import { useLang } from "../hooks/useLang";

export default function WrongAnswers() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<"wrong" | "blank">("wrong");
  const [topicId, setTopicId] = useState<number | "">("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  const { data: items = [] } = useQuery<WrongAnswer[]>({
    queryKey: ["wrong-answers"],
    queryFn: () => api.get("/wrong-answers"),
  });
  const { data: topics = [] } = useQuery<Topic[]>({ queryKey: ["topics"], queryFn: () => api.get("/topics") });

  const create = useMutation({
    mutationFn: () => api.post("/wrong-answers", { questionText: question, type, topicId: topicId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wrong-answers"] }); setQuestion(""); setTopicId(""); setShowNew(false); },
  });

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ isCorrected: boolean; notes: string }> }) =>
      api.patch(`/wrong-answers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wrong-answers"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/wrong-answers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wrong-answers"] }),
  });

  const active = items.filter(i => !i.isCorrected);
  const done = items.filter(i => i.isCorrected);
  const shown = tab === "active" ? active : done;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{t("wrong_title")}</h2>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> {t("wrong_add")}
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder={t("wrong_question_ph")} rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">{t("wrong_type")}:</label>
              <select value={type} onChange={e => setType(e.target.value as "wrong" | "blank")}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="wrong">{t("wrong_type_wrong")}</option>
                <option value="blank">{t("wrong_type_blank")}</option>
              </select>
            </div>
            <select value={topicId} onChange={e => setTopicId(e.target.value ? parseInt(e.target.value) : "")}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">{t("wrong_topic_ph")}</option>
              {topics.map(t2 => <option key={t2.id} value={t2.id}>{t2.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => question && create.mutate()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("add")}</button>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["active", "done"] as const).map(tab2 => (
          <button key={tab2} onClick={() => setTab(tab2)}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              tab === tab2 ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            {tab2 === "active" ? `${t("wrong_active")} (${active.length})` : `${t("wrong_done")} (${done.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map(item => (
          <div key={item.id} className={cn("bg-white rounded-xl border p-4", item.isCorrected ? "border-gray-100 opacity-70" : "border-gray-100")}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                    item.type === "wrong" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500")}>
                    {item.type === "wrong" ? t("wrong_type_wrong") : t("wrong_type_blank")}
                  </span>
                  {item.topicName && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{item.topicName}</span>}
                  <span className="text-xs text-gray-400">{fmtDate(item.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800">{item.questionText}</p>
                {item.notes && <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400">
                  {expanded === item.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {!item.isCorrected && (
                  <button onClick={() => patch.mutate({ id: item.id, data: { isCorrected: true } })}
                    className="p-1.5 rounded-lg hover:bg-green-50 text-gray-300 hover:text-green-500" title={t("wrong_mark")}>
                    <Check size={15} />
                  </button>
                )}
                <button onClick={() => del.mutate(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            {expanded === item.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <input value={notes[item.id] ?? item.notes ?? ""} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                  placeholder={t("wrong_notes_ph")}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={() => patch.mutate({ id: item.id, data: { notes: notes[item.id] ?? "" } })}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("save")}</button>
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{t("wrong_empty")}</div>}
      </div>
    </div>
  );
}
