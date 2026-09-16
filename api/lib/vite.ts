import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

const ADMIN_MANIFEST_URL = "/admin-manifest.webmanifest?v=4";

export function renderAppShell(content: string, pathname: string) {
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isAdmin) return content;

  return content
    .replace("<title>UG Souq</title>", "<title>UGSouq Admin</title>")
    .replace(
      '<link rel="manifest" href="/manifest.webmanifest" />',
      `<link rel="manifest" href="${ADMIN_MANIFEST_URL}" />`,
    )
    .replace(
      '<meta name="apple-mobile-web-app-title" content="UG Souq" />',
      '<meta name="apple-mobile-web-app-title" content="UGSouq Admin" />',
    )
    .replace(
      '<meta name="description" content="Uganda\'s online market — phones, fashion, farm produce and food delivery, paid with MTN MoMo & Airtel Money." />',
      '<meta name="description" content="Standalone administrator dashboard for managing the UGSouq marketplace." />',
    )
    .replace(
      "</title>",
      '</title>\n    <meta name="application-name" content="UGSouq Admin" />',
    );
}

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // Web-app manifests are explicitly served with revalidation headers so an
  // Android browser cannot keep associating /admin with an older customer app.
  app.get("/admin-manifest.webmanifest", (c) => {
    const manifestPath = path.resolve(distPath, "admin-manifest.webmanifest");
    c.header("Content-Type", "application/manifest+json; charset=utf-8");
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    return c.body(fs.readFileSync(manifestPath, "utf-8"));
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }

    const indexPath = path.resolve(distPath, "index.html");
    const source = fs.readFileSync(indexPath, "utf-8");
    const pathname = new URL(c.req.url).pathname;
    const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
    if (isAdmin) c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    return c.html(renderAppShell(source, pathname));
  });
}
