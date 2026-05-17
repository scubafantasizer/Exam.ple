import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { DashboardSummary } from "../lib/types";
import { BookOpen, FileText, Brain, MessageSquare, TrendingUp, Key } from "lucide-react";
import { Link } from "wouter";
import { statusLabel, statusColor, cn } from "../lib/utils";
import { useLang } from "../hooks/useLang";

export default function Dashboard() {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard/summary"),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "refresh") {
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    };
    api.syncChannel.addEventListener("message", handler);
    return () => api.syncChannel.removeEventListener("message", handler);
  }, [qc]);

  if (isLoading) return <div className="p-8 text-gray-400">{t("loading")}</div>;
  if (!data) return null;

  const cards = [
    { label: t("dash_topics"), value: data.totalTopics, icon: BookOpen, color: "bg-indigo-50 text-indigo-600", to: "/topics" },
    { label: t("dash_completed"), value: data.completedTopics, icon: TrendingUp, color: "bg-green-50 text-green-600", to: "/topics" },
    { label: t("dash_resources"), value: data.totalResources, icon: FileText, color: "bg-orange-50 text-orange-600", to: "/resources" },
    { label: t("dash_chats"), value: data.totalChatSessions, icon: MessageSquare, color: "bg-purple-50 text-purple-600", to: "/chat" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t("dash_title")}</h2>
        <p className="text-gray-500 text-sm mt-1">{t("dash_subtitle")}</p>
      </div>

      {!data.hasApiKey && (
        <Link to="/settings" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors block">
          <Key size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">{t("dash_api_warn")}</p>
            <p className="text-amber-600 text-xs">{t("dash_api_warn_sub")}</p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} to={c.to} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow block">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", c.color)}>
              <c.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>

      {data.topicProgress.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">{t("dash_progress")}</h3>
          <div className="space-y-3">
            {data.topicProgress.map(tp => (
              <div key={tp.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{tp.name}{tp.subject ? ` — ${tp.subject}` : ""}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor(tp.status))}>
                    {statusLabel(tp.status, t)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${tp.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentSessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">{t("dash_recent")}</h3>
          <div className="space-y-1">
            {data.recentSessions.map(s => (
              <Link key={s.id} to={`/chat/${s.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors block">
                <span className="text-sm font-medium text-gray-700">{s.title}</span>
                <span className="text-xs text-gray-400">{s.messageCount} {t("dash_msg_count")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.totalTopics === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <Brain className="mx-auto text-indigo-300 mb-3" size={40} />
          <p className="text-gray-600 font-medium">{t("dash_cta_title")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("dash_cta_sub")}</p>
          <Link to="/agent" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            {t("dash_cta_btn")}
          </Link>
        </div>
      )}
    </div>
  );
}
