const BASE = "/api";
const syncChannel = new BroadcastChannel("Yazıcı-sync");

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  
  if (method !== "GET") {
    syncChannel.postMessage("refresh");
  }
  
  return res.json();
}

export const api = {
  get: <T>(path: string) => req<T>("GET", path),
  post: <T>(path: string, body: unknown) => req<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => req<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => req<T>("PATCH", path, body),
  delete: <T>(path: string) => req<T>("DELETE", path),
  syncChannel,
};
