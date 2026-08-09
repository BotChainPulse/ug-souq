import "dotenv/config";

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback || "";
  if (!value && process.env.NODE_ENV === "production") {
    console.warn(`[ENV WARNING] Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  appId: getEnv("APP_ID", "ug-souq"),
  appSecret: getEnv("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: getEnv("DATABASE_URL") || getEnv("MYSQL_URL") || getEnv("MYSQLDATABASE") || "",
};
