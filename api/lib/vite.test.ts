import { describe, expect, it } from "vitest";
import { renderAppShell } from "./vite";

const customerShell = `<!doctype html><html><head>
  <title>UG Souq</title>
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="apple-mobile-web-app-title" content="UG Souq" />
  <meta name="description" content="Uganda's online market — phones, fashion, farm produce and food delivery, paid with MTN MoMo & Airtel Money." />
</head></html>`;

describe("renderAppShell", () => {
  it("serves a distinct, cache-busted administrator app identity", () => {
    const html = renderAppShell(customerShell, "/admin/marketing");

    expect(html).toContain("<title>UGSouq Admin</title>");
    expect(html).toContain('name="application-name" content="UGSouq Admin"');
    expect(html).toContain('href="/admin-manifest.webmanifest?v=3"');
    expect(html).toContain('content="Standalone administrator dashboard');
    expect(html).not.toContain('href="/manifest.webmanifest"');
  });

  it("leaves the customer storefront identity unchanged", () => {
    expect(renderAppShell(customerShell, "/catalog")).toBe(customerShell);
  });
});
