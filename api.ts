// Base API URL — Railway will inject this at build time
export const API_BASE = import.meta.env.VITE_API_URL || "https://ug-souq-production.up.railway.app";

export async function apiGet(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
