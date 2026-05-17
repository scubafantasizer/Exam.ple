import { toast } from "sonner";

export const RATE_LIMIT_MAX = 14; // Gemini free tier allows 15 requests per minute
export const RATE_LIMIT_WINDOW_MS = 60000;

export function checkAiRateLimit(): boolean {
  const now = Date.now();
  const raw = localStorage.getItem("ai_request_log");
  let logs: number[] = raw ? JSON.parse(raw) : [];
  
  logs = logs.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (logs.length >= RATE_LIMIT_MAX) {
    const oldest = logs[0];
    const waitTimeSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    toast.error(`Aşırı istek: API limitine ulaşıldı. Lütfen ${waitTimeSec} saniye bekleyin.`);
    return false; // Not allowed
  }
  
  return true; // Allowed
}

export function logAiRequest() {
  const now = Date.now();
  const raw = localStorage.getItem("ai_request_log");
  let logs: number[] = raw ? JSON.parse(raw) : [];
  logs = logs.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  logs.push(now);
  localStorage.setItem("ai_request_log", JSON.stringify(logs));
}
