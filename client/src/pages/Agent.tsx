import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ChatSession, Message } from "../lib/types";
import { Send, Paperclip, Bot, User, Loader2, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { useLang } from "../hooks/useLang";
import ReactMarkdown from "react-markdown";
import { checkAiRateLimit, logAiRequest } from "../lib/rateLimit";

interface Msg { role: "user" | "model"; content: string; actions?: Action[] }
interface Action { action: string; description: string; resultId?: number | null }

export default function Agent() {
  const { t, lang } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { const b64 = (reader.result as string).split(",")[1]; setFile({ base64: b64, mime: f.type, name: f.name }); };
    reader.readAsDataURL(f);
  };

  const { data: sessions } = useQuery<ChatSession[]>({
    queryKey: ["/chat/sessions"],
    queryFn: () => api.get("/chat/sessions"),
  });

  const brainSession = useMemo(() => sessions?.find(s => s.title === "Brain Agent"), [sessions]);

  const { data: history, isLoading: loadingHistory } = useQuery<Message[]>({
    queryKey: ["/chat/sessions", brainSession?.id, "messages"],
    queryFn: () => api.get(`/chat/sessions/${brainSession!.id}/messages`),
    enabled: !!brainSession,
  });

  useEffect(() => {
    if (history) {
      setMsgs(history.map(m => ({ role: m.role, content: m.content })));
    } else if (!loadingHistory && !brainSession) {
      setMsgs([{ role: "model", content: t("agent_greeting") }]);
    }
  }, [history, brainSession, loadingHistory, t]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() && !file) return;
    if (!checkAiRateLimit()) return;
    logAiRequest();

    let sessionId = brainSession?.id;
    if (!sessionId) {
      try {
        const newSession = await api.post<ChatSession>("/chat/sessions", { title: "Brain Agent" });
        sessionId = newSession.id;
        qc.invalidateQueries({ queryKey: ["/chat/sessions"] });
      } catch (err) {
        console.error("Failed to create Brain Agent session", err);
      }
    }

    const userMsg: Msg = { role: "user", content: input };
    setMsgs(prev => [...prev, userMsg]);
    const sentInput = input;
    const currentMsgs = msgs;
    setInput("");
    setLoading(true);
    try {
      const historyArr = currentMsgs.map(m => ({ role: m.role, content: m.content }));
      const body: Record<string, unknown> = { message: sentInput, history: historyArr, sessionId, language: lang };
      if (file) { body.fileBase64 = file.base64; body.fileMimeType = file.mime; }
      const res = await api.post<{ reply: string; actionsPerformed: Action[] }>("/ai/agent", body);
      setMsgs(prev => [...prev, { role: "model", content: res.reply, actions: res.actionsPerformed }]);
      setFile(null);
      ["topics", "notes", "wrong-answers", "dashboard", "/chat/sessions"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    } catch (err: unknown) {
      setMsgs(prev => [...prev, { role: "model", content: `${t("error")}: ${err instanceof Error ? err.message : "?"}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Bot size={20} className="text-indigo-600" /> {t("agent_title")}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{t("agent_subtitle")}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white",
              m.role === "user" ? "bg-indigo-500" : "bg-gray-700")}>
              {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="max-w-[75%] space-y-2">
              <div className={cn("rounded-2xl px-4 py-3 text-sm",
                m.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm")}>
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-100">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
              {m.actions && m.actions.length > 0 && (
                <div className="space-y-1">
                  {m.actions.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
                      <Zap size={12} className="shrink-0" /><span>{a.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
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
        {file && (
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-lg px-3 py-2">
            <Paperclip size={12} /> {file.name}
            <button onClick={() => setFile(null)} className="ml-auto text-gray-400 hover:text-red-500">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={pickFile} />
          <button onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
            <Paperclip size={18} />
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t("agent_input_ph")}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={send} disabled={loading || (!input.trim() && !file)}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
