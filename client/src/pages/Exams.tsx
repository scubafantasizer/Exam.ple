import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Exam, ExamQuestion, Topic } from "../lib/types";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { cn, fmtDate } from "../lib/utils";
import { useLang } from "../hooks/useLang";
import ReactMarkdown from "react-markdown";
import { checkAiRateLimit, logAiRequest } from "../lib/rateLimit";

type QStatus = "correct" | "wrong" | "blank";

export default function Exams() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState(""); const [publisher, setPublisher] = useState("");
  const [topicId, setTopicId] = useState<number | "">("");
  const [total, setTotal] = useState(40); const [pdfB64, setPdfB64] = useState<string | null>(null);
  const [localQs, setLocalQs] = useState<Record<number, Record<number, QStatus>>>({});
  const [analyses, setAnalyses] = useState<Record<number, string>>({}); const [analyzing, setAnalyzing] = useState<number | null>(null);

  const { data: exams = [] } = useQuery<Exam[]>({ queryKey: ["exams"], queryFn: () => api.get("/exams") });
  const { data: topics = [] } = useQuery<Topic[]>({ queryKey: ["topics"], queryFn: () => api.get("/topics") });
  const { data: examDetail } = useQuery<Exam>({
    queryKey: ["exam", expanded], queryFn: () => api.get(`/exams/${expanded}`), enabled: !!expanded,
  });

  const create = useMutation({
    mutationFn: () => api.post("/exams", { title, publisher: publisher || undefined, topicId: topicId || undefined, totalQuestions: total, pdfBase64: pdfB64 || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); setShowNew(false); setTitle(""); setPublisher(""); setTopicId(""); setTotal(40); setPdfB64(null); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/exams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); setExpanded(null); },
  });
  const saveQs = useMutation({
    mutationFn: ({ id, qs }: { id: number; qs: Record<number, QStatus> }) =>
      api.put(`/exams/${id}/questions`, { questions: Object.entries(qs).map(([n, s]) => ({ questionNumber: parseInt(n), status: s })) }),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ["exams"] }); qc.invalidateQueries({ queryKey: ["exam", id] }); },
  });

  const pickPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setPdfB64(r.result as string); r.readAsDataURL(f);
  };
  const getQ = (examId: number, n: number, questions: ExamQuestion[]): QStatus =>
    localQs[examId]?.[n] ?? questions.find(q => q.questionNumber === n)?.status ?? "correct";
  const setQ = (examId: number, n: number, s: QStatus) =>
    setLocalQs(prev => ({ ...prev, [examId]: { ...prev[examId], [n]: s } }));
  const analyze = async (id: number) => {
    if (!checkAiRateLimit()) return;
    
    setAnalyzing(id);
    try { 
      logAiRequest();
      const res = await api.post<{ analysis: string }>(`/exams/${id}/analyze`, {}); setAnalyses(p => ({ ...p, [id]: res.analysis })); }
    catch (e: unknown) { setAnalyses(p => ({ ...p, [id]: `${t("error")}: ${e instanceof Error ? e.message : "?"}` })); }
    finally { setAnalyzing(null); }
  };

  const statusBtn = (s: QStatus, cur: QStatus) => cn(
    "w-7 h-7 rounded-md text-xs font-bold transition-colors",
    cur === s ? s === "correct" ? "bg-green-500 text-white" : s === "wrong" ? "bg-red-500 text-white" : "bg-gray-400 text-white"
      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{t("exams_title")}</h2>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> {t("exams_new")}
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${t("exams_title_ph")} *`}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder={t("exams_pub_ph")}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={topicId} onChange={e => setTopicId(e.target.value ? parseInt(e.target.value) : "")}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">{t("exams_topic_ph")}</option>
              {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 shrink-0">{t("exams_total")}:</label>
              <input type="number" value={total} onChange={e => setTotal(parseInt(e.target.value) || 1)} min={1} max={200}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">{t("exams_pdf")}:</label>
            <input type="file" accept=".pdf" onChange={pickPdf} className="text-xs text-gray-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => title && create.mutate()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("create")}</button>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {exams.map(exam => {
          const isOpen = expanded === exam.id;
          const qs = examDetail?.id === exam.id ? (examDetail.questions ?? []) : [];
          const pct = exam.totalQuestions ? Math.round(exam.correctCount / exam.totalQuestions * 100) : 0;
          return (
            <div key={exam.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : exam.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{exam.title}</span>
                    {exam.publisher && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{exam.publisher}</span>}
                    {exam.topicName && <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{exam.topicName}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">✓ {exam.correctCount}</span>
                    <span className="text-red-500 font-medium">✗ {exam.wrongCount}</span>
                    <span className="text-gray-400">○ {exam.blankCount}</span>
                    <span className="font-medium text-gray-600">%{pct}</span>
                    <span>{fmtDate(exam.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); del.mutate(exam.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                  {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {qs.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">{t("exams_per_q")}</p>
                      <div className="flex flex-wrap gap-2">
                        {qs.map(q => {
                          const cur = getQ(exam.id, q.questionNumber, qs);
                          return (
                            <div key={q.questionNumber} className="flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-400">{q.questionNumber}</span>
                              <div className="flex gap-0.5">
                                {(["correct", "wrong", "blank"] as QStatus[]).map(s => (
                                  <button key={s} onClick={() => setQ(exam.id, q.questionNumber, s)}
                                    className={statusBtn(s, cur)}
                                    title={s === "correct" ? t("exams_correct") : s === "wrong" ? t("exams_wrong") : t("exams_blank")}>
                                    {s === "correct" ? "D" : s === "wrong" ? "Y" : "B"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => saveQs.mutate({ id: exam.id, qs: localQs[exam.id] ?? {} })}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">{t("save")}</button>
                        <button onClick={() => analyze(exam.id)} disabled={analyzing === exam.id}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1.5 disabled:opacity-50">
                          {analyzing === exam.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          {t("exams_analyze")}
                        </button>
                      </div>
                    </div>
                  )}
                  {(analyses[exam.id] || exam.analysisResult) && (
                    <div className="bg-purple-50 rounded-xl p-4 text-sm">
                      <p className="font-semibold text-purple-700 mb-2 flex items-center gap-1.5"><Sparkles size={14} /> {t("exams_analysis")}</p>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{analyses[exam.id] ?? exam.analysisResult ?? ""}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {exams.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{t("exams_empty")}</div>}
      </div>
    </div>
  );
}
