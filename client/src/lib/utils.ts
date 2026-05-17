import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TKey } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function statusLabel(s: string, t: (k: TKey) => string) {
  return s === "completed" ? t("status_completed") : s === "in_progress" ? t("status_in_progress") : t("status_not_started");
}

export function statusColor(s: string) {
  return s === "completed" ? "text-green-600 bg-green-50" : s === "in_progress" ? "text-blue-600 bg-blue-50" : "text-gray-500 bg-gray-100";
}
