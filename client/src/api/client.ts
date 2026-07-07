export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function api(token?: string | null) {
  return async <T,>(path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "请求失败" }));
      throw new Error(error.message || "请求失败");
    }
    return response.json() as Promise<T>;
  };
}

export async function downloadWithAuth(path: string, token: string | null, filename: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error("下载失败");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
