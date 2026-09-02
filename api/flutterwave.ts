const FLW_BASE = "https://api.flutterwave.com/v3";

export function appUrl() {
  const value = process.env.APP_URL?.replace(/\/$/, "");
  if (!value)
    throw new Error(
      "Payments are not configured. Set APP_URL in Railway Variables."
    );
  return value;
}

export function flutterwaveSecret() {
  const key = process.env.FLW_SECRET_KEY;
  if (!key)
    throw new Error(
      "Payments are not configured. Set FLW_SECRET_KEY in Railway Variables."
    );
  return key;
}

export async function flutterwave(path: string, init: RequestInit = {}) {
  return fetch(`${FLW_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${flutterwaveSecret()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export function isValidFlutterwaveWebhook(signature: string | undefined) {
  const secret = process.env.FLW_WEBHOOK_SECRET;
  return Boolean(secret && signature && signature === secret);
}
