import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Settings as SettingsType } from "../lib/types";
import { Save, ExternalLink, Globe } from "lucide-react";
import { useLang } from "../hooks/useLang";

export default function Settings() {
  const { t, lang, setLang } = useLang();
  const qc = useQueryClient();
  const [form, setForm] = useState({ userName: "", studyGoal: "", dailyStudyMinutes: 60, geminiApiKey: "" });
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery<SettingsType>({ queryKey: ["settings"], queryFn: () => api.get("/settings") });

  useEffect(() => {
    if (settings) setForm({ userName: settings.userName ?? "", studyGoal: settings.studyGoal ?? "", dailyStudyMinutes: settings.dailyStudyMinutes, geminiApiKey: "" });
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.put("/settings", {
      userName: form.userName || undefined,
      studyGoal: form.studyGoal || undefined,
      dailyStudyMinutes: form.dailyStudyMinutes,
      ...(form.geminiApiKey ? { geminiApiKey: form.geminiApiKey } : {}),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={String(form[key])} onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? parseInt(e.target.value) || 0 : e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  );

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{t("settings_title")}</h2>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Profile</h3>
        {field(t("settings_name"), "userName", "text", t("settings_name_ph"))}
        {field(t("settings_goal"), "studyGoal", "text", t("settings_goal_ph"))}
        {field(t("settings_daily"), "dailyStudyMinutes", "number")}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">AI</h3>
        {settings?.hasApiKey && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            API key configured
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings_api")}</label>
          <input type="password" value={form.geminiApiKey} onChange={e => setForm(f => ({ ...f, geminiApiKey: e.target.value }))}
            placeholder={settings?.hasApiKey ? "••••••••  (leave blank to keep)" : t("settings_api_ph")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-500 hover:underline">
            {t("settings_api_help")} <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">{t("settings_lang")}</h3>
        <div className="flex gap-2">
          {(["tr", "en"] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors
                ${lang === l ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <Globe size={14} />
              {l === "tr" ? "Türkçe" : "English"}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => save.mutate()}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
        <Save size={16} />
        {saved ? t("settings_saved") : t("save")}
      </button>
    </div>
  );
}
