import { Link, useRoute } from "wouter";
import { BookOpen, LayoutDashboard, Brain, FileText, AlertCircle, StickyNote, Youtube, Settings, MessageSquare, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import { useLang } from "../hooks/useLang";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useLang();

  const nav = [
    { to: "/", icon: LayoutDashboard, label: t("nav_dashboard") },
    { to: "/agent", icon: Brain, label: t("nav_agent") },
    { to: "/topics", icon: BookOpen, label: t("nav_topics") },
    { to: "/exams", icon: FileText, label: t("nav_exams") },
    { to: "/wrong-answers", icon: AlertCircle, label: t("nav_wrong") },
    { to: "/notes", icon: StickyNote, label: t("nav_notes") },
    { to: "/chat", icon: MessageSquare, label: t("nav_chat") },
    { to: "/resources", icon: Youtube, label: t("nav_resources") },
    { to: "/settings", icon: Settings, label: t("nav_settings") },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-indigo-700 tracking-tight">exam.ple</h1>
          <p className="text-xs text-gray-400 mt-0.5">AI Study Coach</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(n => <NavItem key={n.to} {...n} />)}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setLang(lang === "tr" ? "en" : "tr")}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-indigo-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe size={13} />
            {lang === "tr" ? "Switch to English" : "Türkçe'ye geç"}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const isRoot = to === "/";
  const [activeExact] = useRoute("/");
  const [activePrefix] = useRoute(`${to}/:rest*`);
  const active = isRoot ? activeExact : activePrefix || to === window.location.pathname;

  return (
    <Link to={to} className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
    )}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
