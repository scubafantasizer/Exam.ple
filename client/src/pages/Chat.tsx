import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { api } from "../lib/api";
import { ChatSession, Message, Topic } from "../lib/types";
import { Plus, Send, Bot, User, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useLang } from "../hooks/useLang";
import ReactMarkdown from "react-markdown";
import { checkAiRateLimit, logAiRequest } from "../lib/rateLimit";

export default function Chat() {
  const { t } = useLang();
  const [, params] = useRoute("/chat/:id");
  const [, navigate] = useLocation();
  const sessionId = params?.id ? parseInt(params.id, 10) : null;
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newTopicId, setNewTopicId] = useState<number | "">("");
  const [showNew, setShowNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery<ChatSession[]>({ queryKey: ["sessions"], queryFn: () => api.get("/chat/sessions") });
  const { data: topics = [] } = useQuery<Topic[]>({ queryKey: ["topics"], queryFn: () => api.get("/topics") });
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages", sessionId],
    queryFn: () => api.get(`/chat/sessions/${sessionId}/messages`),
    enabled: !!sessionId,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(c => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const createSession = useMutation({
    mutationFn: () => api.post<ChatSession>("/chat/sessions", { title: newTitle || t("chat_new"), topicId: newTopicId || undefined }),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ["sessions"] }); setShowNew(false); setNewTitle(""); setNewTopicId(""); navigate(`/chat/${s.id}`); },
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => api.delete(`/chat/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); if (sessionId) navigate("/chat"); },
  });

  const sendMsg = async () => {
    if (!input.trim() || !sessionId || sending) return;
    if (!checkAiRateLimit()) return;

    const text = input; setInput(""); setSending(true); setCountdown(60);
    try {
      logAiRequest();
      await api.post(`/chat/sessions/${sessionId}/messages`, { content: text });
      qc.invalidateQueries({ queryKey: ["messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } finally { setSending(false); }
  };

  const activeSession = sessions.find(s => s.id === sessionId);

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <button onClick={() => setShowNew(v => !v)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus size={15} /> {t("chat_new")}
          </button>
          {showNew && (
            <div className="mt-2 space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t("chat_title_ph")}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <select value={newTopicId} onChange={e => setNewTopicId(e.target.value ? parseInt(e.target.value) : "")}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">{t("chat_topic_ph")}</option>
                {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
              </select>
              <button onClick={() => createSession.mutate()}
                className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">{t("create")}</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <div key={s.id} className="group relative">
              <button onClick={() => navigate(`/chat/${s.id}`)}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors pr-10",
                  s.id === sessionId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50")}>
                <div className="truncate">{s.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.messageCount} {t("chat_msg_count")}</div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); if (confirm("Silmek istediğinden emin misin?")) deleteSession.mutate(s.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-gray-400 px-2 py-4 text-center">{t("chat_empty")}</p>}
        </div>
      </div>

      {sessionId && activeSession ? (
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-200 px-5 py-3 bg-white">
            <h3 className="font-semibold text-gray-800">{activeSession.title}</h3>
            {activeSession.topicName && <p className="text-xs text-gray-400">{activeSession.topicName}</p>}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white",
                  m.role === "user" ? "bg-indigo-500" : "bg-gray-700")}>
                  {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                  m.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm")}>
                  <div className="prose prose-sm max-w-none prose-p:my-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white"><Bot size={14} /></div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 size={16} className="text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder={t("chat_input_ph")}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <button onClick={sendMsg} disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-gray-400 text-center italic flex items-center justify-center gap-2">
              {t("chat_tpm_warning")}
              {countdown > 0 && <span className="font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums">-{countdown}s</span>}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
          <MessageSquare size={40} className="text-gray-200" />
          <p className="text-sm">{t("chat_empty")}</p>
        </div>
      )}
    </div>
  );
}
