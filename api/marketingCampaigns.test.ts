import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCampaign, renderEmail } from "./marketingCampaigns";

vi.mock("./queries/connection", () => ({ getDb: vi.fn(() => { throw new Error("Email rendering must not access the database"); }) }));

afterEach(() => vi.unstubAllEnvs());

describe("marketing email destinations", () => {
  const product = {
    slug: "running-sneakers", name: "Running sneakers", price: 120000,
    oldPrice: 185000, image: "/images/sneakers.jpg",
    url: "https://ug-souq-production.up.railway.app/product/running-sneakers",
  };

  it("renders existing campaign images and links on the public domain", () => {
    vi.stubEnv("APP_URL", "https://www.ugsouq.com/");
    const html = renderEmail(normalizeCampaign({
      ctaUrl: "https://ug-souq-production.up.railway.app/catalog?deals=1",
      products: [product],
    }), { unsubscribeToken: "test-token" });
    expect(html).toContain('href="https://www.ugsouq.com/product/running-sneakers"');
    expect(html).toContain('src="https://www.ugsouq.com/images/sneakers.jpg"');
    expect(html).toContain('alt="Running sneakers"');
    expect(html).toContain('href="https://www.ugsouq.com/catalog?deals=1"');
    expect(html).toContain('/unsubscribe?token=test-token&amp;channel=email');
    expect(html).not.toContain("railway.app");
  });

  it("preserves absolute CDN images", () => {
    const html = renderEmail(normalizeCampaign({ products: [{ ...product, image: "https://cdn.example.com/photo.jpg" }] }));
    expect(html).toContain('src="https://cdn.example.com/photo.jpg"');
  });

  it.each(["javascript:alert(1)", "data:image/svg+xml,test", ""])("omits unusable image %s", (image) => {
    const html = renderEmail(normalizeCampaign({ ctaUrl: "javascript:alert(1)", products: [{ ...product, image }] }));
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://www.ugsouq.com/catalog?deals=1"');
  });
});
