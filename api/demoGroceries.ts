import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { products, sellers } from "../db/schema";
import { DEMO_GROCERY_SELLER, demoGroceries } from "../db/demoGroceries";

let activeSync: Promise<{ removedLegacySeller: boolean; demoProducts: number }> | null = null;

export function syncDemoGroceries(db = getDb()) {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    const [legacySeller] = await db.select().from(sellers).where(eq(sellers.shopName, "Kikuubo Suppliers"));
    if (legacySeller) {
      await db.delete(products).where(eq(products.sellerId, legacySeller.id));
      await db.delete(sellers).where(eq(sellers.id, legacySeller.id));
    }

    let [marketSeller] = await db.select().from(sellers).where(eq(sellers.shopName, DEMO_GROCERY_SELLER));
    if (!marketSeller) {
      const [created] = await db.insert(sellers).values({
        shopName: DEMO_GROCERY_SELLER,
        ownerName: "UG Souq Demo Catalog",
        phone: "0700000000",
        email: null,
        idType: "business",
        idNumber: "UGS-DEMO-CATALOG",
        idPhotoName: "ugsouq-demo",
        district: "Kampala",
        landmark: "UG Souq online marketplace",
        tin: null,
        payoutMethod: "mtn_momo",
        payoutNumber: "0700000000",
        verified: true,
        rating: 48,
        status: "approved",
      }).$returningId();
      [marketSeller] = await db.select().from(sellers).where(eq(sellers.id, created.id));
    }

    const existing = await db.select({ slug: products.slug }).from(products).where(eq(products.sellerId, marketSeller.id));
    const existingSlugs = new Set(existing.map(({ slug }) => slug));
    const missing = demoGroceries.filter(({ slug }) => !existingSlugs.has(slug));
    if (missing.length) {
      await db.insert(products).values(missing.map((item) => ({
        sellerId: marketSeller.id,
        name: item.name,
        slug: item.slug,
        category: "grocery",
        price: item.price,
        oldPrice: item.oldPrice,
        image: item.image,
        stock: item.stock,
        condition: "new" as const,
        warrantyMonths: 0,
        flashSale: false,
      })));
    }
    return { removedLegacySeller: Boolean(legacySeller), demoProducts: existingSlugs.size + missing.length };
  })().finally(() => { activeSync = null; });
  return activeSync;
}
