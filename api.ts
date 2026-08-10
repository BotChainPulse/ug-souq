// Base API URL — Railway will inject this at build time
export const API_BASE = import.meta.env.VITE_API_URL || "https://ug-souq-production.up.railway.app";

export async function apiGet(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// tRPC HTTP helpers — admin dashboard calls tRPC procedures directly
export async function trpcQuery(procedure: string, input: Record<string, any>) {
  const cleanInput: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== "") cleanInput[k] = v;
  }
  const params = new URLSearchParams();
  params.set("input", JSON.stringify({ json: cleanInput }));
  const res = await fetch(`${API_BASE}/api/trpc/${procedure}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`tRPC error ${res.status}: ${text}`);
  }
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || "tRPC error");
  return body.result?.data?.json;
}

export async function trpcMutation(procedure: string, input: Record<string, any>) {
  const res = await fetch(`${API_BASE}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`tRPC error ${res.status}: ${text}`);
  }
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || "tRPC error");
  return body.result?.data?.json;
}
