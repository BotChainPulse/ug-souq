import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, asc, like, or, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { sellers, sellerIdentityDocuments, products, restaurants, menuItems, orders, orderItems, affiliates, listings, customers, deliveryPartners, sellerAdBookings, notifications, plusMemberships, plusPayments, marketingSubscribers, sellerSubscriptions } from "../db/schema";
import { plusPlan } from "./plus";
import { adminRouter } from "./admin";
import { trustRouter } from "./trust";
import { bootstrapRouter } from "./bootstrap";
import { migrateRouter } from "./migrate";
import { syncDemoGroceries } from "./demoGroceries";
import { getServerDeliveryQuote, validateRequestedItems } from "./orderValidation";
import { commissionForLine, PRO_MONTHLY_FEE, sellerPlan } from "./sellerPolicy";
import { encryptIdentity, identityFingerprint, IDENTITY_CONSENT_VERSION, identityStorageReady, parseIdentityDocumentDataUrl } from "./identity";
import { createPesapalPayment, pesapalConfigured } from "./pesapal";
import { pilotDeliveryFee } from "./plusPilot";

function orderCode() {
  // Unambiguous alphabet: no O/0, I/1, L â€” buyers type these codes by hand
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return "US-" + c;
}

const normPhone = (p: string) => p.replace(/[\s-]+/g, "").trim();

const normalizeMarketingPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("256")) return `+${digits}`;
  if (digits.startsWith("0")) return `+256${digits.slice(1)}`;
  return `+256${digits}`;
};



// Every orderer owns an account: keep their name + delivery location up to date.
async function upsertCustomer(db: any, name: string, phone: string, location?: string) {
  const p = normPhone(phone);
  const [existing] = await db.select().from(customers).where(eq(customers.phone, p));
  if (existing) {
    await db.update(customers).set({ name, location: location ?? existing.location }).where(eq(customers.id, existing.id));
  } else {
    await db.insert(customers).values({ name, phone: p, location: location ?? null });
  }
}

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  admin: adminRouter,
  trust: trustRouter,
  bootstrap: bootstrapRouter,
  migrate: migrateRouter,

  marketing: createRouter({
    subscribe: publicQuery
      .input(z.object({
        name: z.string().trim().max(255).optional(),
        email: z.string().trim().max(255).optional(),
        phone: z.string().trim().max(32).optional(),
        emailOptIn: z.boolean(),
        whatsappOptIn: z.boolean(),
        consentAccepted: z.boolean(),
        source: z.enum(["homepage", "checkout", "account"]).default("homepage"),
        website: z.string().max(200).optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.website) return { ok: true };
        if (!input.consentAccepted || (!input.emailOptIn && !input.whatsappOptIn)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Choose Email or WhatsApp and accept the marketing consent." });
        }

        const email = input.email?.toLowerCase() || null;
        const phone = input.phone ? normalizeMarketingPhone(input.phone) : null;
        if (input.emailOptIn && (!email || !z.string().email().safeParse(email).success)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid email address for email offers." });
        }
        if (input.whatsappOptIn && (!phone || !/^\+256\d{9}$/.test(phone))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid Ugandan WhatsApp number." });
        }

        const db = getDb();
        const match = email && phone
          ? or(eq(marketingSubscribers.email, email), eq(marketingSubscribers.phone, phone))
          : email
            ? eq(marketingSubscribers.email, email)
            : eq(marketingSubscribers.phone, phone!);
        const [existing] = await db.select().from(marketingSubscribers).where(match).limit(1);
        const now = new Date();

        if (existing) {
          await db.update(marketingSubscribers).set({
            name: input.name || existing.name,
            ...(email ? { email, emailOptIn: input.emailOptIn, emailUnsubscribedAt: input.emailOptIn ? null : existing.emailUnsubscribedAt } : {}),
            ...(phone ? { phone, whatsappOptIn: input.whatsappOptIn, whatsappUnsubscribedAt: input.whatsappOptIn ? null : existing.whatsappUnsubscribedAt } : {}),
            consentSource: input.source,
            consentVersion: "2026-09-01",
            consentedAt: now,
          }).where(eq(marketingSubscribers.id, existing.id));
        } else {
          await db.insert(marketingSubscribers).values({
            name: input.name || null,
            email,
            phone,
            emailOptIn: input.emailOptIn,
            whatsappOptIn: input.whatsappOptIn,
            consentSource: input.source,
            consentVersion: "2026-09-01",
            unsubscribeToken: randomBytes(24).toString("hex"),
            consentedAt: now,
          });
        }
        return { ok: true };
      }),
    unsubscribe: publicQuery
      .input(z.object({ token: z.string().length(48), channel: z.enum(["email", "whatsapp", "all"]) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [subscriber] = await db.select().from(marketingSubscribers).where(eq(marketingSubscribers.unsubscribeToken, input.token)).limit(1);
        if (!subscriber) return { ok: false };
        const now = new Date();
        await db.update(marketingSubscribers).set({
          ...(input.channel !== "whatsapp" ? { emailOptIn: false, emailUnsubscribedAt: now } : {}),
          ...(input.channel !== "email" ? { whatsappOptIn: false, whatsappUnsubscribedAt: now } : {}),
        }).where(eq(marketingSubscribers.id, subscriber.id));
        return { ok: true };
      }),
  }),

  products: createRouter({
    homepageGroceries: publicQuery.query(async () => {
      const db = getDb();
      await syncDemoGroceries(db);
      const rows = await db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(sellers.shopName, "UG Souq Market"));
      return rows.map(({ product, seller }) => ({
        ...product,
        sellerName: seller.shopName,
        sellerVerified: seller.verified,
        sellerRating: seller.rating / 10,
        discount: product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0,
      }));
    }),
    flashSale: publicQuery.query(async () => {
      const db = getDb();
      const rows = await db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(products.flashSale, true));
      return rows
        .map(({ product, seller }) => ({
          ...product,
          sellerName: seller.shopName,
          sellerVerified: seller.verified,
          sellerRating: seller.rating / 10,
          discount: product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0,
        }))
        .sort((a, b) => Number(b.sellerVerified) - Number(a.sellerVerified));
    }),
    bySlug: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      const db = getDb();
      const listingMatch = /^listing-(\d+)$/.exec(input.slug);
      if (listingMatch) {
        const listingId = Number(listingMatch[1]);
        const [listingRow] = await db
          .select({ listing: listings, seller: sellers })
          .from(listings)
          .innerJoin(sellers, eq(listings.sellerId, sellers.id))
          .where(eq(listings.id, listingId));
        if (!listingRow || listingRow.listing.status !== "approved") return null;
        const { listing, seller } = listingRow;
        return {
          kind: "listing" as const,
          id: listing.id,
          sellerId: listing.sellerId,
          name: listing.name,
          slug: input.slug,
          category: listing.category,
          price: listing.price,
          oldPrice: listing.oldPrice,
          image: listing.imageData ?? "/images/product-default.png",
          stock: listing.stock,
          condition: listing.condition,
          warrantyMonths: listing.warrantyMonths,
          flashSale: false,
          createdAt: listing.createdAt,
          sellerName: seller.shopName,
          sellerVerified: seller.verified,
          sellerRating: seller.rating / 10,
          sellerDistrict: seller.district,
          discount: listing.oldPrice ? Math.round((1 - listing.price / listing.oldPrice) * 100) : 0,
        };
      }
      const [row] = await db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(products.slug, input.slug));
      if (!row) return null;
      return {
        kind: "product" as const,
        ...row.product,
        sellerName: row.seller.shopName,
        sellerVerified: row.seller.verified,
        sellerRating: row.seller.rating / 10,
        sellerDistrict: row.seller.district,
        discount: row.product.oldPrice ? Math.round((1 - row.product.price / row.product.oldPrice) * 100) : 0,
      };
    }),
    bySeller: publicQuery.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      const db = getDb();
      const [seller] = await db.select().from(sellers).where(eq(sellers.id, input.sellerId));
      if (!seller) return null;
      const rows = await db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(products.sellerId, input.sellerId));
      const items = rows.map(({ product, seller }) => ({
        kind: "product" as const,
        ...product,
        sellerName: seller.shopName,
        sellerVerified: seller.verified,
        sellerRating: seller.rating / 10,
        discount: product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0,
      }));
      const lrows = await db
        .select({ listing: listings, seller: sellers })
        .from(listings)
        .innerJoin(sellers, eq(listings.sellerId, sellers.id))
        .where(eq(listings.sellerId, input.sellerId));
      const litems = lrows
        .filter(({ listing }) => listing.status === "approved")
        .map(({ listing, seller }) => ({
          kind: "listing" as const,
          id: listing.id,
          sellerId: listing.sellerId,
          name: listing.name,
          slug: 'listing-' + listing.id,
          category: listing.category,
          price: listing.price,
          oldPrice: listing.oldPrice,
          image: listing.imageData ?? "/images/product-default.png",
          stock: listing.stock,
          condition: listing.condition,
          warrantyMonths: listing.warrantyMonths,
          flashSale: false,
          createdAt: listing.createdAt,
          sellerName: seller.shopName,
          sellerVerified: seller.verified,
          sellerRating: seller.rating / 10,
          discount: listing.oldPrice ? Math.round((1 - listing.price / listing.oldPrice) * 100) : 0,
        }));
      return {
        seller: {
          id: seller.id,
          shopName: seller.shopName,
          verified: seller.verified,
          rating: seller.rating / 10,
          district: seller.district,
        },
        products: [...items, ...litems].sort((a, b) => Number(b.sellerVerified) - Number(a.sellerVerified)),
      };
    }),
    browse: publicQuery
      .input(z.object({
        category: z.string().optional(),
        condition: z.enum(["new", "refurbished", "used"]).optional(),
        deals: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const db = getDb();
        const rows = await db
          .select({ product: products, seller: sellers })
          .from(products)
          .innerJoin(sellers, eq(products.sellerId, sellers.id));
        const cat = input.category?.trim().toLowerCase();
        const items = rows
          .map(({ product, seller }) => ({
            kind: "product" as const,
            ...product,
            sellerName: seller.shopName,
            sellerVerified: seller.verified,
            sellerRating: seller.rating / 10,
            discount: product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0,
          }))
          .filter((p) => (cat ? p.category.toLowerCase() === cat : true))
          .filter((p) => (input.condition ? p.condition === input.condition : true))
          .filter((p) => (input.deals ? p.discount >= 5 : true));
        // Approved seller listings appear on the market too, with their uploaded photos
        const lrows = await db
          .select({ listing: listings, seller: sellers })
          .from(listings)
          .innerJoin(sellers, eq(listings.sellerId, sellers.id))
          .where(eq(listings.status, "approved"));
        const litems = lrows
          .map(({ listing, seller }) => ({
            kind: "listing" as const,
            id: listing.id,
            sellerId: listing.sellerId,
            name: listing.name,
            slug: `listing-${listing.id}`,
            category: listing.category,
            price: listing.price,
            oldPrice: listing.oldPrice,
            image: listing.imageData ?? "/images/product-default.png",
            stock: listing.stock,
            condition: listing.condition,
            warrantyMonths: listing.warrantyMonths,
            flashSale: false,
            createdAt: listing.createdAt,
            sellerName: seller.shopName,
            sellerVerified: seller.verified,
            sellerRating: seller.rating / 10,
            discount: listing.oldPrice ? Math.round((1 - listing.price / listing.oldPrice) * 100) : 0,
          }))
          .filter((p) => (cat ? p.category.toLowerCase() === cat : true))
          .filter((p) => (input.condition ? p.condition === input.condition : true))
          .filter((p) => (input.deals ? p.discount >= 5 : true));
        return [...items, ...litems].sort((a, b) => Number(b.sellerVerified) - Number(a.sellerVerified));
      }),
    search: publicQuery.input(z.object({ q: z.string().min(1) })).query(async ({ input }) => {
      const db = getDb();
      const q = `%${input.q.trim()}%`;
      const rows = await db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(or(like(products.name, q), like(products.category, q)));
      return rows
        .map(({ product, seller }) => ({
          ...product,
          sellerName: seller.shopName,
          sellerVerified: seller.verified,
          discount: product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0,
        }))
        .sort((a, b) => Number(b.sellerVerified) - Number(a.sellerVerified));
    }),
  }),

  food: createRouter({
    search: publicQuery.input(z.object({ q: z.string().min(1) })).query(async ({ input }) => {
      const db = getDb();
      const q = `%${input.q.trim()}%`;
      return db.select().from(restaurants)
        .where(or(like(restaurants.name, q), like(restaurants.cuisine, q), like(restaurants.area, q)))
        .orderBy(desc(restaurants.rating));
    }),
    restaurants: publicQuery.query(async () => {
      const db = getDb();
      return db.select().from(restaurants).orderBy(desc(restaurants.featured), desc(restaurants.rating));
    }),
    restaurant: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      const db = getDb();
      const [r] = await db.select().from(restaurants).where(eq(restaurants.slug, input.slug));
      if (!r) return null;
      const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, r.id)).orderBy(desc(menuItems.popular), asc(menuItems.price));
      return { ...r, items };
    }),
  }),

  orders: createRouter({
    paymentOptions: publicQuery.query(() => ({ pesapal: pesapalConfigured(), environment: process.env.PESAPAL_ENV === "live" ? "live" as const : "sandbox" as const })),
    create: publicQuery
      .input(z.object({
        customerName: z.string().min(2),
        phone: z.string().min(9),
        address: z.string().max(500).default(""),
        zoneId: z.string().default("kampala"),
        deliveryMethod: z.enum(["door", "pickup"]).default("door"),
        stationId: z.string().optional(),
        paymentMethod: z.enum(["mtn_momo", "airtel_money", "cash"]),
        items: z.array(z.object({
          itemType: z.enum(["product", "listing", "menu_item"]),
          itemId: z.number().int().positive(),
          // Kept optional for older clients. The server never trusts these display values.
          name: z.string().optional(),
          price: z.number().optional(),
          qty: z.number().int().min(1).max(99),
        })).min(1).max(50),
        // Kept only so an older cached PWA can still submit. It is deliberately ignored.
        deliveryFee: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        validateRequestedItems(input.items);
        const quotedDelivery = getServerDeliveryQuote(input);

        return db.transaction(async (tx) => {
          const canonicalItems: Array<{
            itemType: "product" | "listing" | "menu_item";
            itemId: number;
            name: string;
            price: number;
            qty: number;
            sellerId: number | null;
            commissionRate: string;
            commissionFee: number;
            sellerNet: number;
          }> = [];

          const commercialTerms = async (sellerId: number) => {
            const [subscription] = await tx
              .select()
              .from(sellerSubscriptions)
              .where(eq(sellerSubscriptions.sellerId, sellerId));
            return sellerPlan(subscription);
          };

          for (const requested of input.items) {
            if (requested.itemType === "product") {
              const [row] = await tx
                .select({ item: products })
                .from(products)
                .innerJoin(sellers, eq(products.sellerId, sellers.id))
                .where(and(eq(products.id, requested.itemId), eq(sellers.status, "approved")))
                .for("update");
              if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "A product in your cart is no longer available." });
              if (row.item.stock < requested.qty) {
                throw new TRPCError({ code: "CONFLICT", message: `${row.item.name} has only ${row.item.stock} left in stock.` });
              }
              await tx.update(products)
                .set({ stock: sql`${products.stock} - ${requested.qty}` })
                .where(eq(products.id, requested.itemId));
              const terms = await commercialTerms(row.item.sellerId);
              const fee = commissionForLine(row.item.price, requested.qty, terms.commissionRate);
              canonicalItems.push({ itemType: "product", itemId: row.item.id, name: row.item.name, price: row.item.price, qty: requested.qty, sellerId: row.item.sellerId, commissionRate: terms.commissionRate.toFixed(4), commissionFee: fee, sellerNet: row.item.price * requested.qty - fee });
              continue;
            }

            if (requested.itemType === "listing") {
              const [row] = await tx
                .select({ item: listings })
                .from(listings)
                .innerJoin(sellers, eq(listings.sellerId, sellers.id))
                .where(and(
                  eq(listings.id, requested.itemId),
                  eq(listings.status, "approved"),
                  eq(sellers.status, "approved"),
                ))
                .for("update");
              if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "A seller listing in your cart is no longer available." });
              if (row.item.stock < requested.qty) {
                throw new TRPCError({ code: "CONFLICT", message: `${row.item.name} has only ${row.item.stock} left in stock.` });
              }
              await tx.update(listings)
                .set({ stock: sql`${listings.stock} - ${requested.qty}` })
                .where(eq(listings.id, requested.itemId));
              const terms = await commercialTerms(row.item.sellerId);
              const fee = commissionForLine(row.item.price, requested.qty, terms.commissionRate);
              canonicalItems.push({ itemType: "listing", itemId: row.item.id, name: row.item.name, price: row.item.price, qty: requested.qty, sellerId: row.item.sellerId, commissionRate: terms.commissionRate.toFixed(4), commissionFee: fee, sellerNet: row.item.price * requested.qty - fee });
              continue;
            }

            const [row] = await tx
              .select({ item: menuItems })
              .from(menuItems)
              .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
              .where(and(eq(menuItems.id, requested.itemId), eq(restaurants.open, true)));
            if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "A menu item in your cart is no longer available." });
            canonicalItems.push({ itemType: "menu_item", itemId: row.item.id, name: row.item.name, price: row.item.price, qty: requested.qty, sellerId: null, commissionRate: "0.0000", commissionFee: 0, sellerNet: row.item.price * requested.qty });
          }

          const subtotal = canonicalItems.reduce((sum, item) => sum + item.price * item.qty, 0);
          const phone = normPhone(input.phone);
          const commissionFee = canonicalItems.reduce((sum, item) => sum + item.commissionFee, 0);
          await upsertCustomer(tx, input.customerName, phone, quotedDelivery.address);
          // Plus is still a pilot. Do not waive delivery charges until the benefit,
          // provider settlement and administrator controls are explicitly launched.
          const deliveryFee = pilotDeliveryFee(quotedDelivery.deliveryFee);
          const total = subtotal + deliveryFee;
          const [inserted] = await tx.insert(orders).values({
            code: orderCode(),
            customerName: input.customerName.trim(),
            phone,
            address: quotedDelivery.address,
            paymentMethod: input.paymentMethod,
            subtotal,
            deliveryFee,
            commissionFee,
            total,
          }).$returningId();
          await tx.insert(orderItems).values(
            canonicalItems.map((item) => ({ orderId: inserted.id, ...item })),
          );
          const [order] = await tx.select().from(orders).where(eq(orders.id, inserted.id));
          return order;
        });
      }),
    byPhone: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      const phone = normPhone(input.phone);
      const myOrders = await db.select().from(orders).where(eq(orders.phone, phone)).orderBy(desc(orders.createdAt)).limit(20);
      const withItems = await Promise.all(
        myOrders.map(async (o) => ({ ...o, items: await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)) })),
      );
      return withItems;
    }),
    // Buyer says "I've sent the MoMo/Airtel money" â€” we hold the order as pending_confirmation until admin verifies
    submitPayment: publicQuery
      .input(z.object({
        code: z.string(),
        phone: z.string().min(9),
        ref: z.string().min(6, "Enter the full transaction ID from your MoMo/Airtel message").max(64),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [order] = await db.select().from(orders).where(eq(orders.code, input.code.trim().toUpperCase()));
        if (!order || normPhone(order.phone) !== normPhone(input.phone)) throw new Error("Order not found for that code and phone number.");
        if (order.paymentMethod === "cash") throw new Error("This order is cash on delivery â€” no mobile payment needed.");
        if (order.paymentStatus === "paid") return { ok: true, already: true };
        await db.update(orders).set({ paymentStatus: "pending_confirmation", paymentRef: input.ref.trim() }).where(eq(orders.id, order.id));
        return { ok: true, already: false };
      }),
    startPesapalPayment: publicQuery
      .input(z.object({ code: z.string().min(4).max(16), phone: z.string().min(9).max(32) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [order] = await db.select().from(orders).where(eq(orders.code, input.code.trim().toUpperCase())).limit(1);
        if (!order || normPhone(order.phone) !== normPhone(input.phone)) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found for that code and phone number." });
        return createPesapalPayment(order);
      }),
    track: publicQuery.input(z.object({ code: z.string(), phone: z.string() })).query(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.code, input.code.trim().toUpperCase()));
      if (!order || normPhone(order.phone) !== normPhone(input.phone)) return null;
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    }),
  }),

  sellers: createRouter({
    verificationReadiness: publicQuery.query(() => ({ secureIdentityUpload: identityStorageReady() })),
    register: publicQuery
      .input(z.object({
        shopName: z.string().min(2),
        ownerName: z.string().min(2),
        phone: z.string().min(9),
        email: z.string().optional(),
        idType: z.string(),
        idNumber: z.string().min(3),
        idDocumentName: z.string().trim().min(1).max(255),
        idDocumentData: z.string().min(1_000).max(1_500_000),
        identityConsentAccepted: z.literal(true),
        district: z.string(),
        landmark: z.string(),
        tin: z.string().optional(),
        payoutMethod: z.string(),
        payoutNumber: z.string().min(9),
        commissionTermsAccepted: z.boolean(),
        sellerContractAccepted: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!input.commissionTermsAccepted || !input.sellerContractAccepted) {
          throw new Error("You must accept seller contract and commission terms.");
        }
        const phone = normPhone(input.phone);
        const [duplicatePhone] = await db.select({ id: sellers.id }).from(sellers).where(eq(sellers.phone, phone)).limit(1);
        if (duplicatePhone) throw new TRPCError({ code: "CONFLICT", message: "A seller account already exists for this phone number." });
        const idNumber = input.idNumber.trim().toUpperCase();
        const fingerprint = identityFingerprint(idNumber);
        const [duplicateIdentity] = await db.select({ id: sellerIdentityDocuments.id }).from(sellerIdentityDocuments).where(eq(sellerIdentityDocuments.idNumberFingerprint, fingerprint)).limit(1);
        if (duplicateIdentity) throw new TRPCError({ code: "CONFLICT", message: "This identity is already linked to a seller account. Contact privacy support if this is unexpected." });
        const idNumberEncrypted = encryptIdentity(idNumber);
        const document = parseIdentityDocumentDataUrl(input.idDocumentData);
        const documentEncrypted = encryptIdentity(document.normalizedDataUrl);
        const documentType = input.idType === "Passport" ? "passport" as const : input.idType === "Driving permit" ? "driving_permit" as const : "national_id" as const;
        const now = new Date();
        const row = await db.transaction(async (tx) => {
          const [created] = await tx.insert(sellers).values({
            shopName: input.shopName, ownerName: input.ownerName, phone,
            email: input.email || null, idType: input.idType, idNumber: null, idPhotoName: null,
            district: input.district, landmark: input.landmark, tin: input.tin || null,
            payoutMethod: input.payoutMethod, payoutNumber: normPhone(input.payoutNumber),
            status: "pending", commissionTermsAccepted: true, sellerContractAccepted: true,
            commissionTermsAcceptedAt: now, sellerContractAcceptedAt: now,
          }).$returningId();
          await tx.insert(sellerIdentityDocuments).values({
            sellerId: created.id, documentType,
            idNumberCiphertext: idNumberEncrypted.ciphertext, idNumberIv: idNumberEncrypted.iv, idNumberTag: idNumberEncrypted.tag,
            idNumberFingerprint: fingerprint, idNumberLast4: idNumber.slice(-4),
            documentCiphertext: documentEncrypted.ciphertext, documentIv: documentEncrypted.iv, documentTag: documentEncrypted.tag,
            mimeType: document.mimeType, originalName: input.idDocumentName.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 255),
            consentVersion: IDENTITY_CONSENT_VERSION, consentedAt: now, status: "pending",
          });
          return created;
        });
        await db.insert(notifications).values({
          type: "seller_registered", title: "Seller identity review required",
          message: `${input.shopName} submitted a protected identity record for administrator review.`,
          entityType: "seller", entityId: String(row.id),
        });
        return { id: row.id };
      }),
    lookup: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      const phone = input.phone.trim();
      const [row] = await db.select().from(sellers).where(eq(sellers.phone, phone));
      if (!row) return null;
      const myListings = await db.select().from(listings).where(eq(listings.sellerId, row.id)).orderBy(desc(listings.createdAt));
      const [subscription] = await db.select().from(sellerSubscriptions).where(eq(sellerSubscriptions.sellerId, row.id));
      const plan = sellerPlan(subscription);
      const listingsUsed = myListings.filter((listing) => !["rejected", "terminated"].includes(listing.status)).length;
      return {
        id: row.id,
        shopName: row.shopName,
        ownerName: row.ownerName,
        district: row.district,
        verified: row.verified,
        status: row.status,
        listings: myListings,
        plan: { ...plan, listingsUsed, monthlyFee: PRO_MONTHLY_FEE },
      };
    }),
    addListing: publicQuery
      .input(z.object({
        phone: z.string().min(9),
        name: z.string().min(3),
        category: z.string().min(2),
        price: z.number().min(100),
        oldPrice: z.number().optional(),
        stock: z.number().min(1).max(10000),
        condition: z.enum(["new", "refurbished", "used"]),
        warrantyMonths: z.number().min(0).max(60),
        isBranded: z.boolean().default(false),
        brandName: z.string().trim().max(128).optional(),
        authenticityEvidence: z.string().trim().max(1000).optional(),
        imageNote: z.string().optional(),
        imageData: z.string().min(100, "A real photo of the item is required").max(2_000_000, "Photo is too large to save"),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [seller] = await db.select().from(sellers).where(eq(sellers.phone, input.phone.trim()));
        if (!seller) throw new Error("No shop registered with this phone number. Register your shop first.");
        if (seller.status !== "approved") throw new Error("Your shop must be approved before you can list items.");
        if (input.isBranded && (!input.brandName || !input.authenticityEvidence || input.authenticityEvidence.length < 10)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Branded goods require a brand name and supplier, invoice, serial-number or authorization evidence." });
        }
        const [subscription] = await db.select().from(sellerSubscriptions).where(eq(sellerSubscriptions.sellerId, seller.id));
        const plan = sellerPlan(subscription);
        const sellerListings = await db.select().from(listings).where(eq(listings.sellerId, seller.id));
        const listingsUsed = sellerListings.filter((listing) => !["rejected", "terminated"].includes(listing.status)).length;
        if (listingsUsed >= plan.listingLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: plan.tier === "free"
              ? `Your five free listing slots are in use. Upgrade to Seller Pro for up to 50 active listings.`
              : `Your Seller Pro limit of ${plan.listingLimit} active listings is in use. Contact support for a larger business plan.`,
          });
        }
        const [row] = await db.insert(listings).values({
          sellerId: seller.id,
          name: input.name,
          category: input.category,
          price: input.price,
          oldPrice: input.oldPrice ?? null,
          stock: input.stock,
          condition: input.condition,
          warrantyMonths: input.condition === "new" ? 0 : input.warrantyMonths,
          imageNote: input.imageNote ?? "Photo uploaded by seller",
          imageData: input.imageData,
          isBranded: input.isBranded,
          brandName: input.isBranded ? input.brandName : null,
          authenticityEvidence: input.isBranded ? input.authenticityEvidence : null,
          status: "pending",
        }).$returningId();
        await db.insert(notifications).values({
          type: "listing_pending",
          title: "New Listing Pending Review",
          message: `${seller.shopName} added ${input.name}`,
          entityType: "listing",
          entityId: String(row.id),
        });
        return { id: row.id };
      }),
    bookAd: publicQuery
      .input(z.object({
        phone: z.string().min(9),
        listingId: z.number().int().positive(),
        planType: z.enum(["weekly", "monthly"]),
        headline: z.string().trim().min(5).max(90),
        message: z.string().trim().min(10).max(180),
        objective: z.enum(["product_sales", "product_views", "shop_visits"]),
        cta: z.enum(["shop_now", "view_product", "visit_shop"]),
        requestedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        notes: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const digits = input.phone.replace(/\D/g, "");
        const canonicalPhone = digits.startsWith("256") ? `0${digits.slice(3)}` : digits.length === 9 ? `0${digits}` : digits;
        const allSellers = await db.select().from(sellers);
        const seller = allSellers.find((candidate) => {
          const candidateDigits = candidate.phone.replace(/\D/g, "");
          const candidatePhone = candidateDigits.startsWith("256") ? `0${candidateDigits.slice(3)}` : candidateDigits.length === 9 ? `0${candidateDigits}` : candidateDigits;
          return candidatePhone === canonicalPhone;
        });
        if (!seller) throw new TRPCError({ code: "NOT_FOUND", message: "No shop is registered with this phone number." });
        if (seller.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Your shop must be approved before booking an advert." });

        const sellerListings = await db.select().from(listings).where(eq(listings.sellerId, seller.id));
        const selectedListing = sellerListings.find((listing) => listing.id === input.listingId && listing.status === "approved");
        if (!selectedListing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You need at least one approved product listing before booking an advert." });
        }
        if (selectedListing.stock < 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an approved product that is currently in stock." });
        }

        const existingBookings = await db.select().from(sellerAdBookings).where(eq(sellerAdBookings.sellerId, seller.id));
        const openBooking = existingBookings.find((booking) => ["booked", "paid", "active"].includes(booking.status));
        if (openBooking) {
          throw new TRPCError({ code: "CONFLICT", message: `Your shop already has advert booking AD-${openBooking.id} (${openBooking.status}).` });
        }

        const amount = input.planType === "weekly" ? 25000 : 50000;
        const [row] = await db.insert(sellerAdBookings).values({
          sellerId: seller.id,
          listingId: selectedListing.id,
          planType: input.planType,
          amount,
          headline: input.headline,
          message: input.message,
          objective: input.objective,
          cta: input.cta,
          requestedStartDate: input.requestedStartDate ?? null,
          status: "booked",
          notes: input.notes ?? null,
        }).$returningId();
        return { id: row.id, reference: `AD-${row.id}`, amount, shopName: seller.shopName, productName: selectedListing.name, headline: input.headline, planType: input.planType };
      }),
  }),

  delivery: createRouter({
    registerPartner: publicQuery
      .input(z.object({
        fullName: z.string().min(2),
        phone: z.string().min(9),
        area: z.string().min(2),
        vehicleType: z.enum(["boda", "car", "van", "truck"]),
        payoutMethod: z.enum(["mtn_momo", "airtel_money"]),
        payoutNumber: z.string().min(9),
        contractAccepted: z.boolean(),
        deliveryShareAccepted: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!input.contractAccepted || !input.deliveryShareAccepted) {
          throw new Error("You must accept delivery contract and 10% platform share terms.");
        }

        const [row] = await db.insert(deliveryPartners).values({
          fullName: input.fullName,
          phone: normPhone(input.phone),
          area: input.area,
          vehicleType: input.vehicleType,
          payoutMethod: input.payoutMethod,
          payoutNumber: normPhone(input.payoutNumber),
          contractAccepted: true,
          deliveryShareAccepted: true,
          contractAcceptedAt: new Date(),
          status: "pending",
        }).$returningId();
        return { id: row.id };
      }),
  }),

  customers: createRouter({
    // Create or update the buyer's account (name + delivery location)
    register: publicQuery
      .input(z.object({
        name: z.string().min(2),
        phone: z.string().min(9),
        location: z.string().min(3),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await upsertCustomer(db, input.name, input.phone, input.location);
        const [row] = await db.select().from(customers).where(eq(customers.phone, normPhone(input.phone)));
        return row;
      }),
    // Profile + full order history â€” the buyer's account home
    me: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      const phone = normPhone(input.phone);
      const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
      const myOrders = await db.select().from(orders).where(eq(orders.phone, phone)).orderBy(desc(orders.createdAt)).limit(20);
      const withItems = await Promise.all(
        myOrders.map(async (o) => ({ ...o, items: await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)) })),
      );
      const [membership] = customer
        ? await db.select().from(plusMemberships).where(eq(plusMemberships.customerId, customer.id))
        : [];
      const activeMembership = membership && membership.status === "active" && membership.expiresAt && membership.expiresAt > new Date()
        ? membership
        : null;
      return { customer: customer ?? null, orders: withItems, membership: activeMembership, membershipRecord: membership ?? null };
    }),
    // Destructive deletion must not be authorised by a phone number alone.
    // Requests are received through /delete-account and completed after identity verification.
    deleteAccount: publicQuery
      .input(z.object({ phone: z.string().min(9) }))
      .mutation(() => {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Use the verified account deletion request at /delete-account.",
        });
      }),
  }),

  plus: createRouter({
    plan: publicQuery.query(() => plusPlan),
    status: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      const [customer] = await db.select().from(customers).where(eq(customers.phone, normPhone(input.phone)));
      if (!customer) return { membership: null, latestPayment: null };
      const [membership] = await db.select().from(plusMemberships).where(eq(plusMemberships.customerId, customer.id));
      const [latestPayment] = await db.select().from(plusPayments).where(eq(plusPayments.customerId, customer.id)).orderBy(desc(plusPayments.createdAt)).limit(1);
      const active = membership && membership.status === "active" && membership.expiresAt && membership.expiresAt > new Date() ? membership : null;
      return { membership: active, membershipRecord: membership ?? null, latestPayment: latestPayment#ß<¶‰žËkºwµçQ…Ñ„èÁÉ½™¥±•…Ñ„ô€ôÑÉÁŒ¹ÕÍÑ½µ•ÉÌ¹µ”¹ÕÍ•EÕ•Éä (€€€ìÁ¡½¹”è…½Õ¹Ðü¹Á¡½¹”€üü€œœô°(€€€ì•¹…‰±•è€„……½Õ¹Ðô°(€€¤((€½¹ÍÐì‘…Ñ„è½É‘•ÉÍ…Ñ„ô€ôÑÉÁŒ¹½É‘•ÉÌ¹‰åA¡½¹”¹ÕÍ•EÕ•Éä (€€€ìÁ¡½¹”è…½Õ¹Ðü¹Á¡½¹”€üü€œœô°(€€€ì•¹…‰±•è€„……½Õ¹Ðô°(€€¤((€ÕÍ•™™•Ð  ¤€ôøì(€€€¥˜€¡ÁÉ½™¥±•…Ñ„ü¹ÕÍÑ½µ•È€˜˜…½Õ¹Ð¤ì(€€€€€½¹ÍÐÕÁ‘…Ñ•€ôì(€€€€€€€€¸¸¹…½Õ¹Ð°(€€€€€€€¹…µ”èÁÉ½™¥±•…Ñ„¹ÕÍÑ½µ•È¹¹…µ”ñð…½Õ¹Ð¹¹…µ”°(€€€€€€€±½…Ñ¥½¸èÁÉ½™¥±•…Ñ„¹ÕÍÑ½µ•È¹±½…Ñ¥½¸ñð…½Õ¹Ð¹±½…Ñ¥½¸(€€€€€ô(€€€€€Í•Ñ½Õ¹Ð¡ÕÁ‘…Ñ•¤(€€€€€Í…Ù•½Õ¹Ð¡ÕÁ‘…Ñ•¤(€€€€€Í•Ñ½É´¡ÕÁ‘…Ñ•¤(€€€ô(€ô°mÁÉ½™¥±•…Ñ…t¤((€½¹ÍÐ¡…¹‘±•M…Ù”€ô€ ¤€ôøì(€€€¥˜€ …™½É´¹¹…µ”¹ÑÉ¥´ ¤ñð€…™½É´¹Á¡½¹”¹ÑÉ¥´ ¤¤É•ÑÕÉ¸(€€€Í…Ù•½Õ¹Ð¡™½É´¤(€€€Í•Ñ½Õ¹Ð¡™½É´¤(€€€Í•Ñ‘¥Ñ¥¹œ¡™…±Í”¤(€€€É•¥ÍÑ•È¹µÕÑ…Ñ”¡ì¹…µ”è™½É´¹¹…µ”°Á¡½¹”è™½É´¹Á¡½¹”°±½…Ñ¥½¸è™½É´¹±½…Ñ¥½¸ô¤(€ô((€½¹ÍÐ¡…¹‘±••±•Ñ”€ô€ ¤€ôøì(€€€¥˜€ ……½Õ¹Ð¤É•ÑÕÉ¸(€€€‘•±•Ñ•½Õ¹Ð¹µÕÑ…Ñ” (€€€€€ìÁ¡½¹”è…½Õ¹Ð¹Á¡½¹”ô°(€€€€€ì(€€€€€€€½¹MÕ•ÍÌè€ ¤€ôøì(€€€€€€€€€±•…É½Õ¹Ð ¤(€€€€€€€€€Í•Ñ½Õ¹Ð¡¹Õ±°¤(€€€€€€€€€Í•Ñ½É´¡ì¹…µ”è€œœ°Á¡½¹”è€œœ°±½…Ñ¥½¸è€œœô¤(€€€€€€€€€Í•Ñ½¹™¥Éµ•±•Ñ”¡™…±Í”¤(€€€€€€€€€Í•Ñ‘¥Ñ¥¹œ¡ÑÉÕ”¤(€€€€€€€ô°(€€€€€ô(€€€€¤(€ô((€½¹ÍÐ¡…¹‘±•1½½ÕÐ€ô€ ¤€ôøì(€€€±•…É½Õ¹Ð ¤(€€€Í•Ñ½Õ¹Ð¡¹Õ±°¤(€€€Í•Ñ½É´¡ì¹…µ”è€œœ°Á¡½¹”è€œœ°±½…Ñ¥½¸è€œœô¤(€€€Í•Ñ‘¥Ñ¥¹œ¡ÑÉÕ”¤(€€€Ý¥¹‘½Ü¹±½…Ñ¥½¸¹¡É•˜€ô€œ¼œ(€ô((€½¹ÍÐ½É‘•ÉÌ€ô½É‘•ÉÍ…Ñ„€üümt(€½¹ÍÐÁ±ÕÍÑ¥Ù”€ô	½½±•…¸¡ÁÉ½™¥±•…Ñ„ü¹µ•µ‰•ÉÍ¡¥À¤(€½¹ÍÐmÝ¥Í¡±¥ÍÑt€ôÕÍ•MÑ…Ñ”¡±½…‘]¥Í¡±¥ÍÐ¤(€½¹ÍÐì‘…Ñ„è…Ñ…±½%Ñ•µÌ°¥Í1½…‘¥¹œèÝ¥Í¡±¥ÍÑ1½…‘¥¹œô€ôÑÉÁŒ¹ÁÉ½‘ÕÑÌ¹‰É½ÝÍ”¹ÕÍ•EÕ•Éä (€€€íô°(€€€ì•¹…‰±•èÝ¥Í¡±¥ÍÐ¹±•¹Ñ €ø€Àô°(€€¤(€½¹ÍÐÝ¥Í¡±¥ÍÑ%Ñ•µÌ€ôÝ¥Í¡±¥ÍÐ¹µ…À ¡­•ä¤€ôø€¡ì(€€€­•ä°(€€€¥Ñ•´è…Ñ…±½%Ñ•µÌü¹™¥¹ ¡¥Ñ•´¤€ôø€‘í¥Ñ•´¹­¥¹‘ô´‘í¥Ñ•´¹¥‘õ€€ôôô­•ä¤°(€ô¤¤((€½¹ÍÐµ•¹Õ%Ñ•µÌ€ôl(€€€ì¥½¸è5…ÁA¥¹¹•°±…‰•°è€‘‘É•ÍÍ•Ìœ°Ñ¼è€œ½…‘‘É•ÍÍ•Ìœô°(€€€ì¥½¸èÉ•‘¥Ñ…É°±…‰•°è€A…åµ•¹Ð5•Ñ¡½‘Ìœ°Ñ¼è€œ½Á…åµ•¹ÐµÍ•ÑÑ¥¹Ìœô°(€€€ì¥½¸èQÉÕ¬°±…‰•°è€•±¥Ù•É¥•Ìœ°Ñ¼è€œ½‘•±¥Ù•É¥•Ìœô°(€€€ì¥½¸èU¹‘¼È°±…‰•°è€I•ÑÕÉ¹Ìœ°Ñ¼è€œ½É•ÑÕÉ¹Ìœô°(€€€ì¥½¸èM¡¥•±‘¡•¬°±…‰•°è€]…ÉÉ…¹Ñä±…¥µÌœ°Ñ¼è€œ½Ñ•ÉµÌœô°(€€€ì¥½¸è±½‰”°±…‰•°è€1…¹Õ…”œ°Ù…±Õ”è€¹±¥Í œ°Ñ¼è€œ½…½Õ¹Ðœô°(€€€ì¥½¸è5…ÁA¥¸°±…‰•°è€½Õ¹ÑÉäœ°Ù…±Õ”è€U…¹‘„œ°Ñ¼è€œ½…½Õ¹Ðœô°(€€€ì¥½¸èM•ÑÑ¥¹Ì°±…‰•°è€AÉ•™•É•¹•Ìœ°Ñ¼è€œ½ÁÉ•™•É•¹•Ìœô°(€€€ì¥½¸è	•±°°±…‰•°è€9½Ñ¥™¥…Ñ¥½¹Ìœ°Ñ¼è€œ½¹½Ñ¥™¥…Ñ¥½¹Ìœô°(€€€ì¥½¸è1½¬°±…‰•°è€½Õ¹ÐM•ÕÉ¥Ñäœ°Ñ¼è€œ½…½Õ¹ÐµÍ•ÕÉ¥Ñäœô°(€€€ì¥½¸èQÉ…Í È°±…‰•°è€•±•Ñ”…½Õ¹Ð€˜‘…Ñ„œ°Ñ¼è€œ½‘•±•Ñ”µ…½Õ¹Ðœô°(€t((€¥˜€ ……½Õ¹Ðñð•‘¥Ñ¥¹œ¤ì(€€€É•ÑÕÉ¸€ (€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µ µÍÉ••¸‰œµÉ…ä´ÔÀˆø(€€€€€€€€ñ!•…‘•È€¼ø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ…àµÜµµµàµ…ÕÑ¼Áà´ÐÁä´àˆø(€€€€€€€€€€ñ Ä±…ÍÍ9…µ”ô‰Ñ•áÐ´Éá°™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀµˆ´Øˆø(€€€€€€€€€€€í…½Õ¹Ð€ü€‘¥ÐAÉ½™¥±”œ€è€É•…Ñ”½Õ¹Ðô(€€€€€€€€€€ð½ Äø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÁ…”µä´Ðˆø(€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”ô‰‰±½¬Ñ•áÐµÍ´™½¹Ðµµ•‘¥Õ´Ñ•áÐµÉ…ä´ÜÀÀµˆ´ÄˆùÕ±°9…µ”ð½±…‰•°ø(€€€€€€€€€€€€€€ñ¥¹ÁÕÐ(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°Áà´ÐÁä´ÌÉ½Õ¹‘•µ±œ‰½É‘•È‰½É‘•ÈµÉ…ä´ÌÀÀ™½ÕÌéÉ¥¹œ´È™½ÕÌéÉ¥¹œµ½É…¹”´ÔÀÀ™½ÕÌé‰½É‘•Èµ½É…¹”´ÔÀÀ½ÕÑ±¥¹”µ¹½¹”ˆ(€€€€€€€€€€€€€€€Ù…±Õ”õí™½É´¹¹…µ•ô(€€€€€€€€€€€€€€€½¹¡…¹”õì¡”¤€ôøÍ•Ñ½É´¡ì€¸¸¹™½É´°¹…µ”è”¹Ñ…É•Ð¹Ù…±Õ”ô¥ô(€€€€€€€€€€€€€€€Á±…•¡½±‘•Èô‰e½ÕÈ¹…µ”ˆ(€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”ô‰‰±½¬Ñ•áÐµÍ´™½¹Ðµµ•‘¥Õ´Ñ•áÐµÉ…ä´ÜÀÀµˆ´ÄˆùA¡½¹”9Õµ‰•Èð½±…‰•°ø(€€€€€€€€€€€€€€ñ¥¹ÁÕÐ(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°Áà´ÐÁä´ÌÉ½Õ¹‘•µ±œ‰½É‘•È‰½É‘•ÈµÉ…ä´ÌÀÀ™½ÕÌéÉ¥¹œ´È™½ÕÌéÉ¥¹œµ½É…¹”´ÔÀÀ™½ÕÌé‰½É‘•Èµ½É…¹”´ÔÀÀ½ÕÑ±¥¹”µ¹½¹”ˆ(€€€€€€€€€€€€€€€Ù…±Õ”õí™½É´¹Á¡½¹•ô(€€€€€€€€€€€€€€€½¹¡…¹”õì¡”¤€ôøÍ•Ñ½É´¡ì€¸¸¹™½É´°Á¡½¹”è”¹Ñ…É•Ð¹Ù…±Õ”ô¥ô(€€€€€€€€€€€€€€€Á±…•¡½±‘•ÈôˆÀÝa`aa`aa`ˆ(€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”ô‰‰±½¬Ñ•áÐµÍ´™½¹Ðµµ•‘¥Õ´Ñ•áÐµÉ…ä´ÜÀÀµˆ´Äˆù1½…Ñ¥½¸€¼¥ÍÑÉ¥Ðð½±…‰•°ø(€€€€€€€€€€€€€€ñ¥¹ÁÕÐ(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°Áà´ÐÁä´ÌÉ½Õ¹‘•µ±œ‰½É‘•È‰½É‘•ÈµÉ…ä´ÌÀÀ™½ÕÌéÉ¥¹œ´È™½ÕÌéÉ¥¹œµ½É…¹”´ÔÀÀ™½ÕÌé‰½É‘•Èµ½É…¹”´ÔÀÀ½ÕÑ±¥¹”µ¹½¹”ˆ(€€€€€€€€€€€€€€€Ù…±Õ”õí™½É´¹±½…Ñ¥½¹ô(€€€€€€€€€€€€€€€½¹¡…¹”õì¡”¤€ôøÍ•Ñ½É´¡ì€¸¸¹™½É´°±½…Ñ¥½¸è”¹Ñ…É•Ð¹Ù…±Õ”ô¥ô(€€€€€€€€€€€€€€€Á±…•¡½±‘•Èô‰”¹œ¸-…µÁ…±„°5Á¥¤ˆ(€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€½¹±¥¬õí¡…¹‘±•M…Ù•ô(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°Áä´ÌÉ½Õ¹‘•µ±œ™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÝ¡¥Ñ”ˆ(€€€€€€€€€€€€€ÍÑå±”õíì‰…­É½Õ¹‘½±½Èè=I9õô(€€€€€€€€€€€€ø(€€€€€€€€€€€€€í…½Õ¹Ð€ü€M…Ù”¡…¹•Ìœ€è€É•…Ñ”½Õ¹Ðô(€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€í…½Õ¹Ð€˜˜€ (€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•Ñ‘¥Ñ¥¹œ¡™…±Í”¥ô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°Áä´ÌÉ½Õ¹‘•µ±œ™½¹ÐµÍ•µ¥‰½±‰½É‘•È‰½É‘•ÈµÉ…ä´ÌÀÀÑ•áÐµÉ…ä´ÜÀÀˆ(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€…¹•°(€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€¥ô(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½‘¥Øø(€€€€€€€€ñ½½Ñ•È€¼ø(€€€€€€ð½‘¥Øø(€€€€¤(€ô((€É•ÑÕÉ¸€ (€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ¥¸µ µÍÉ••¸‰œµÉ…ä´ÔÀÁˆ´ÈÐˆø(€€€€€€ñ!•…‘•È€¼ø((€€€€€ì¼¨AÉ½™¥±”…É€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‰œµÝ¡¥Ñ”µà´ÌµÐ´ÌÉ½Õ¹‘•´Éá°À´ÐÍ¡…‘½ÜµÍ´ˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ðˆø(€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€±…ÍÍ9…µ”ô‰Ü´ÄØ ´ÄØÉ½Õ¹‘•µ™Õ±°™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÑ•áÐµÝ¡¥Ñ”Ñ•áÐ´Éá°™½¹Ðµ‰½±ˆ(€€€€€€€€€€€ÍÑå±”õíì‰…­É½Õ¹‘½±½Èè=I9õô(€€€€€€€€€€ø(€€€€€€€€€€€í…½Õ¹Ð¹¹…µ”ü¹¡…ÉÐ À¤ü¹Ñ½UÁÁ•É…Í” ¤ñð€Tô(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à´Äµ¥¸µÜ´Àˆø(€€€€€€€€€€€€ñ È±…ÍÍ9…µ”ô‰Ñ•áÐµ±œ™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀÑÉÕ¹…Ñ”ˆø(€€€€€€€€€€€€€í…½Õ¹Ð¹¹…µ”ñð€ÕÍÑ½µ•Èô(€€€€€€€€€€€€ð½ Èø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´ÌµÐ´ÄÑ•áÐµáÌÑ•áÐµÉ…ä´ÔÀÀˆø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Äˆø(€€€€€€€€€€€€€€€€ñA¡½¹”Í¥é”õìÄÉô€¼øí…½Õ¹Ð¹Á¡½¹•ô(€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Äˆø(€€€€€€€€€€€€€€€€ñ5…ÁA¥¸Í¥é”õìÄÉô€¼øí…½Õ¹Ð¹±½…Ñ¥½¸ñð€1½…Ñ¥½¸¹½Ð…‘‘•ô(€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•Ñ‘¥Ñ¥¹œ¡ÑÉÕ”¥ô(€€€€€€€€€€€±…ÍÍ9…µ”ô‰À´ÈÉ½Õ¹‘•µ™Õ±°‰œµÉ…ä´ÄÀÀ¡½Ù•Èé‰œµÉ…ä´ÈÀÀˆ(€€€€€€€€€€ø(€€€€€€€€€€€€ñ‘¥ÐÌÍ¥é”õìÄÙô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ØÀÀˆ€¼ø(€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€ð½‘¥Øø(€€€€€€ð½‘¥Øø((€€€€€ì¼¨1½å…±Ñä	…¹¹•È€¨½ô(€€€€€€ñ‘¥Ø(€€€€€€€±…ÍÍ9…µ”ô‰µà´ÌµÐ´ÌÉ½Õ¹‘•´Éá°À´ÐÑ•áÐµÝ¡¥Ñ”™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸ˆ(€€€€€€€ÍÑå±”õíì‰…­É½Õ¹è±¥¹•…ÈµÉ…‘¥•¹Ð ÄÌÕ‘•œ°€‘í=I9ô°€äÕÅ”¥€õô(€€€€€€ø(€€€€€€€€ñ‘¥Øø(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌ™½¹Ðµµ•‘¥Õ´½Á…¥Ñä´äÀˆùUM½ÕÄð½Àø(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹Ðµ‰½±ˆùíÁ±ÕÍÑ¥Ù”€ü€A±ÕÌÁ¥±½ÐÉ•½Éœ€è€UM½ÕÄA±ÕÌÁ¥±½Ðôð½Àø(€€€€€€€€ð½‘¥Øø(€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½Á±ÕÌˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌ™½¹Ðµ‰½±‰œµÝ¡¥Ñ”Áà´ÌÁä´Ä¸ÔÉ½Õ¹‘•µ™Õ±°ˆÍÑå±”õíì½±½Èè=I9õôø(€€€€€€€€€€€íÁ±ÕÍÑ¥Ù”€ü€Y¥•ÜÁ¥±½ÐÍÑ…ÑÕÌƒŠèœ€è€A¥±½Ð‘•Ñ…¥±ÌƒŠèô(€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€ð½1¥¹¬ø(€€€€€€ð½‘¥Øø((€€€€€ì¼¨=É‘•ÉÌ€˜]¥Í¡±¥ÍÐEÕ¥¬…É‘Ì€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µà´ÌµÐ´ÌÉ¥É¥µ½±Ì´È…À´Ìˆø(€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½½É‘•ÉÌˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‰œµÝ¡¥Ñ”É½Õ¹‘•´Éá°À´ÐÍ¡…‘½ÜµÍ´ˆø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸µˆ´Èˆø(€€€€€€€€€€€€€€ñA…­…”Í¥é”õìÈÁôÍÑå±”õíì½±½Èè=I9õô€¼ø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ…ä´ÐÀÀˆùí½É‘•ÉÌ¹±•¹Ñ¡ô½É‘•ÉÌð½ÍÁ…¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀÑ•áÐµÍ´ˆù5ä=É‘•ÉÌð½Àø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à…À´ÄµÐ´Èˆø(€€€€€€€€€€€€€í½É‘•ÉÌ¹Í±¥” À°€Ì¤¹µ…À ¡¼è…¹ä°¤è¹Õµ‰•È¤€ôø€ (€€€€€€€€€€€€€€€€ñ‘¥Ø­•äõí¥ô±…ÍÍ9…µ”ô‰™±•à ´àÜ´à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÉ½Õ¹‘•‰œµ½É…¹”´ÔÀˆ…É¥„µ±…‰•°õí=É‘•È€‘í¼¹½‘”ñð¤€¬€Åõôø(€€€€€€€€€€€€€€€€€€ñA…­…”Í¥é”õìÄÕôÍÑå±”õíì½±½Èè=I9õô€¼ø(€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€€í½É‘•ÉÌ¹±•¹Ñ €ôôô€À€˜˜€ (€€€€€€€€€€€€€€€€ðø(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ü´à ´àÉ½Õ¹‘•‰œµÉ…ä´ÄÀÀˆ€¼ø(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ü´à ´àÉ½Õ¹‘•‰œµÉ…ä´ÄÀÀˆ€¼ø(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ü´à ´àÉ½Õ¹‘•‰œµÉ…ä´ÄÀÀˆ€¼ø(€€€€€€€€€€€€€€€€ð¼ø(€€€€€€€€€€€€€€¥ô(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½1¥¹¬ø((€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½Ý¥Í¡±¥ÍÐˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‰œµÝ¡¥Ñ”É½Õ¹‘•´Éá°À´ÐÍ¡…‘½ÜµÍ´ˆø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸µˆ´Èˆø(€€€€€€€€€€€€€€ñ!•…ÉÐÍ¥é”õìÈÁô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ•´ÔÀÀˆ€¼ø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ…ä´ÐÀÀˆùíÝ¥Í¡±¥ÍÐ¹±•¹Ñ¡ôíÝ¥Í¡±¥ÍÐ¹±•¹Ñ €ôôô€Ä€ü€¥Ñ•´œ€è€¥Ñ•µÌôð½ÍÁ…¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀÑ•áÐµÍ´ˆù5ä]¥Í¡±¥ÍÐð½Àø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µÐ´È™±•àµ¥¸µ ´à¥Ñ•µÌµ•¹Ñ•È…À´Äˆø(€€€€€€€€€€€€€íÝ¥Í¡±¥ÍÑ1½…‘¥¹œ(€€€€€€€€€€€€€€€€ül¸¸¹ÉÉ…ä¡5…Ñ ¹µ¥¸¡Ý¥Í¡±¥ÍÐ¹±•¹Ñ °€Ì¤¥t¹µ…À ¡|°¥¹‘•à¤€ôø€ñÍÁ…¸­•äõí¥¹‘•áô±…ÍÍ9…µ”ô‰ ´àÜ´à…¹¥µ…Ñ”µÁÕ±Í”É½Õ¹‘•µµ‰œµÉ…ä´ÄÀÀˆ€¼ø¤(€€€€€€€€€€€€€€€€èÝ¥Í¡±¥ÍÑ%Ñ•µÌ¹Í±¥” À°€Ì¤¹µ…À ¡ì­•ä°¥Ñ•´ô¤€ôø¥Ñ•´€ü€ (€€€€€€€€€€€€€€€€€€ñ¥µœ­•äõí­•åôÍÉŒõí¥Ñ•´¹¥µ…”ñð€œ½¥µ…•Ì½ÁÉ½‘ÕÐµ‘•™…Õ±Ð¹Á¹œô…±Ðõí¥Ñ•´¹¹…µ•ô±…ÍÍ9…µ”ô‰ ´àÜ´àÉ½Õ¹‘•µµ‰½É‘•È‰½É‘•ÈµÉ…ä´ÄÀÀ‰œµÝ¡¥Ñ”½‰©•Ðµ½¹Ñ…¥¸ˆ€¼ø(€€€€€€€€€€€€€€€€¤€è€ (€€€€€€€€€€€€€€€€€€ñÍÁ…¸­•äõí­•åô±…ÍÍ9…µ”ô‰É¥ ´àÜ´àÁ±…”µ¥Ñ•µÌµ•¹Ñ•ÈÉ½Õ¹‘•µµ‰œµÉ…ä´ÔÀÑ•áÐµÉ…ä´ÌÀÀˆøñ!•…ÉÐÍ¥é”õìÄÑô€¼øð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€€íÝ¥Í¡±¥ÍÐ¹±•¹Ñ €ôôô€À€˜˜€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÅÁát±•…‘¥¹œµÑ¥¡ÐÑ•áÐµÉ…ä´ÐÀÀˆùM…Ù”ÁÉ½‘ÕÑÌÑ¼Í•”Ñ¡•´¡•É”ð½ÍÁ…¸ùô(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½1¥¹¬ø(€€€€€€ð½‘¥Øø((€€€€€ì¼¨5•¹Ô1¥ÍÐ€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µà´ÌµÐ´Ì‰œµÝ¡¥Ñ”É½Õ¹‘•´Éá°Í¡…‘½ÜµÍ´½Ù•É™±½Üµ¡¥‘‘•¸ˆø(€€€€€€€íµ•¹Õ%Ñ•µÌ¹µ…À ¡¥Ñ•´°¥‘à¤€ôø€ (€€€€€€€€€€ñ‘¥Ø­•äõí¥Ñ•´¹±…‰•±ôø(€€€€€€€€€€€€ñ1¥¹¬(€€€€€€€€€€€€€Ñ¼õí¥Ñ•´¹Ñ½ô(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸À´Ð¡½Ù•Èé‰œµÉ…ä´ÔÀˆ(€€€€€€€€€€€€ø(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ìˆø(€€€€€€€€€€€€€€€€ñ¥Ñ•´¹¥½¸Í¥é”õìÈÁô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ØÀÀˆ€¼ø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰™½¹Ðµµ•‘¥Õ´Ñ•áÐµÉ…ä´äÀÀÑ•áÐµÍ´ˆùí¥Ñ•´¹±…‰•±ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Èˆø(€€€€€€€€€€€€€€€ì¡¥Ñ•´…Ì…¹ä¤¹Ù…±Õ”€˜˜€ (€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ…ä´ÔÀÀˆùì¡¥Ñ•´…Ì…¹ä¤¹Ù…±Õ•ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€¥ô(€€€€€€€€€€€€€€€€ñ¡•ÙÉ½¹I¥¡ÐÍ¥é”õìÄÙô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ÐÀÀˆ€¼ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€€í¥‘à€ðµ•¹Õ%Ñ•µÌ¹±•¹Ñ €´€Ä€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰ µÁà‰œµÉ…ä´ÄÀÀµà´Ðˆ€¼ùô(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€¤¥ô(€€€€€€€ì¼¨M¥¸=ÕÐ€¨½ô(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ µÁà‰œµÉ…ä´ÄÀÀµà´Ðˆ€¼ø(€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€½¹±¥¬õí¡…¹‘±•1½½ÕÑô(€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸À´ÐÑ•áÐµ±•™Ð¡½Ù•Èé‰œµÉ…ä´ÔÀˆ(€€€€€€€€ø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ìˆø(€€€€€€€€€€€€ñ1½=ÕÐÍ¥é”õìÈÁô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ•´ÔÀÀˆ€¼ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰™½¹Ðµµ•‘¥Õ´Ñ•áÐµÉ•´ÔÀÀÑ•áÐµÍ´ˆùM¥¸=ÕÐð½ÍÁ…¸ø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ¡•ÙÉ½¹I¥¡ÐÍ¥é”õìÄÙô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ÐÀÀˆ€¼ø(€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€ð½‘¥Øø((€€€€€ì¼¨5ä=É‘•ÉÌAÉ•Ù¥•Ü€¨½ô(€€€€€í½É‘•ÉÌ¹±•¹Ñ €ø€À€˜˜€ (€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Áà´ÐµÐ´Ðµˆ´Ðˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸µˆ´Ìˆø(€€€€€€€€€€€€ñ È±…ÍÍ9…µ”ô‰Ñ•áÐµ±œ™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀ™±•à¥Ñ•µÌµ•¹Ñ•È…À´Èˆø(€€€€€€€€€€€€€€ñA…­…”Í¥é”õìÈÁôÍÑå±”õíì½±½Èè=I9õô€¼ø5ä=É‘•ÉÌ(€€€€€€€€€€€€ð½ Èø(€€€€€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½½É‘•ÉÌˆ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±ˆÍÑå±”õíì½±½Èè=I9õôø(€€€€€€€€€€€€€M•”…±°€¡í½É‘•ÉÌ¹±•¹Ñ¡ô¤(€€€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÁ…”µä´Ìˆø(€€€€€€€€€€€í½É‘•ÉÌ¹Í±¥” À°€Ì¤¹µ…À ¡¼è…¹ä¤€ôø€ (€€€€€€€€€€€€€€ñ1¥¹¬­•äõí¼¹¥‘ôÑ¼õí€½½É‘•ÉÌ¼‘í•¹½‘•UI%½µÁ½¹•¹Ð¡¼¹½‘”¥õô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰‰±½¬‰œµÝ¡¥Ñ”É½Õ¹‘•µá°À´ÐÍ¡…‘½ÜµÍ´‰½É‘•È‰½É‘•ÈµÉ…ä´ÄÀÀˆø(€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸µˆ´Èˆø(€€€€€€€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀÑ•áÐµÍ´ˆùí¼¹½‘•ôð½Àø(€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ…ä´ÔÀÀˆø(€€€€€€€€€€€€€€€€€€€€€í¼¹É•…Ñ•‘Ð€ü¹•Ü…Ñ”¡¼¹É•…Ñ•‘Ð¤¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ •¸µœ¤€è€œô(€€€€€€€€€€€€€€€€€€€€ð½Àø(€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€ñMÑ…ÑÕÍA¥±°ÍÑ…ÑÕÌõí¼¹ÍÑ…ÑÕÍô€¼ø(€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€í¼¹¥Ñ•µÌü¹µ…À ¡¥Ðè…¹ä°¥‘àè¹Õµ‰•È¤€ôø€ (€€€€€€€€€€€€€€€€€€ñ‘¥Ø­•äõí¥‘áô±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸Áä´Äˆø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ…ä´ÜÀÀˆùí¥Ð¹ÅÑå÷\í¥Ð¹¹…µ•ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÉ…ä´äÀÀˆùí™µÐ¡¥Ð¹ÁÉ¥”€¨¥Ð¹ÅÑä¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•ÑÝ••¸ÁÐ´ÈµÐ´È‰½É‘•ÈµÐ‰½É‘•ÈµÉ…ä´ÄÀÀˆø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ…ä´ÔÀÀˆùQ½Ñ…°€¡íÁ…åµ•¹Ñ1…‰•°¡ìÁ…åµ•¹Ñ5•Ñ¡½è¼¹Á…åµ•¹Ñ5•Ñ¡½°Á…åµ•¹ÑMÑ…ÑÕÌè¼¹Á…åµ•¹ÑMÑ…ÑÕÌô¤¹Ñ•áÑô¤ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰™½¹Ðµ‰½±Ñ•áÐµÍ´ˆÍÑå±”õíì½±½Èè=I9õôùí™µÐ¡¼¹Ñ½Ñ…°¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€€€¤¥ô(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½‘¥Øø(€€€€€€¥ô((€€€€€ì¼¨½½Ñ•È€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µà´ÌµÐ´Øµˆ´àÑ•áÐµ•¹Ñ•Èˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à©ÕÍÑ¥™äµ•¹Ñ•È…À´Øµˆ´Ìˆø(€€€€€€€€€€ñ…•‰½½¬Í¥é”õìÈÁô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ÐÀÀˆ€¼ø(€€€€€€€€€€ñ%¹ÍÑ…É…´Í¥é”õìÈÁô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ÐÀÀˆ€¼ø(€€€€€€€€€€ñ1¥¹­•‘¥¸Í¥é”õìÈÁô±…ÍÍ9…µ”ô‰Ñ•áÐµÉ…ä´ÐÀÀˆ€¼ø(€€€€€€€€ð½‘¥Øø(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ…ä´ÐÀÀˆùA½±¥¥•Ì€™¹‰ÍÀì™¹‰ÍÀìM•±°½¸UM½ÕÄƒŠ\ð½Àø(€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÁÁátÑ•áÐµÉ…ä´ÌÀÀµÐ´Èˆû
¤€ÈÀÈØÕÍ½ÕÄ¹½´¸±°É¥¡ÑÌÉ•Í•ÉÙ•¸ð½Àø(€€€€€€ð½‘¥Øø((€€€€€€ñ½½Ñ•È€¼ø((€€€€€ì¼¨	½ÑÑ½´9…Ø€¨½ô(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™¥á•‰½ÑÑ½´´À±•™Ð´ÀÉ¥¡Ð´À‰œµÝ¡¥Ñ”‰½É‘•ÈµÐ‰½É‘•ÈµÉ…ä´ÈÀÀè´ÐÀˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ…É½Õ¹Áä´Èˆø(€€€€€€€€€€ñ1¥¹¬Ñ¼ôˆ¼ˆ±…ÍÍ9…µ”ô‰™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´À¸ÔÑ•áÐµÉ…ä´ÔÀÀˆø(€€€€€€€€€€€€ñ!½µ”Í¥é”õìÈÉô€¼ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÁÁátˆù!½µ”ð½ÍÁ…¸ø(€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½…Ñ…±½œˆ±…ÍÍ9…µ”ô‰™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´À¸ÔÑ•áÐµÉ…ä´ÔÀÀˆø(€€€€€€€€€€€€ñÉ¥Í`ÌÍ¥é”õìÈÉô€¼ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÁÁátˆù…Ñ•½É¥•Ìð½ÍÁ…¸ø(€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½…ÉÐˆ±…ÍÍ9…µ”ô‰™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´À¸ÔÑ•áÐµÉ…ä´ÔÀÀˆø(€€€€€€€€€€€€ñM¡½ÁÁ¥¹…ÉÐÍ¥é”õìÈÉô€¼ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÁÁátˆù…ÉÐð½ÍÁ…¸ø(€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½Ý¥Í¡±¥ÍÐˆ±…ÍÍ9…µ”ô‰™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´À¸ÔÑ•áÐµÉ…ä´ÔÀÀˆø(€€€€€€€€€€€€ñ!•…ÉÐÍ¥é”õìÈÉô€¼ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÁÁátˆù]¥Í¡±¥ÍÐð½ÍÁ…¸ø(€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€€€ñ1¥¹¬Ñ¼ôˆ½…½Õ¹Ðˆ±…ÍÍ9…µ”ô‰™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´À¸Ô™½¹ÐµÍ•µ¥‰½±ˆÍÑå±”õíì½±½Èè=I9õôø(€€€€€€€€€€€€ñUÍ•ÉI½Õ¹Í¥é”õìÈÉô€¼ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÁÁátˆù½Õ¹Ðð½ÍÁ…¸ø(€€€€€€€€€€ð½1¥¹¬ø(€€€€€€€€ð½‘¥Øø(€€€€€€ð½‘¥Øø((€€€€€ì¼¨•±•Ñ”½¹™¥É´5½‘…°€¨½ô(€€€€€í½¹™¥Éµ•±•Ñ”€˜˜€ (€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™¥á•¥¹Í•Ð´À‰œµ‰±…¬¼ÔÀè´ÔÀ™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ•¹Ñ•ÈÀ´Ðˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‰œµÝ¡¥Ñ”É½Õ¹‘•´Éá°À´Øµ…àµÜµÍ´Üµ™Õ±°ˆø(€€€€€€€€€€€€ñ Ì±…ÍÍ9…µ”ô‰Ñ•áÐµ±œ™½¹Ðµ‰½±Ñ•áÐµÉ…ä´äÀÀµˆ´Èˆù•±•Ñ”½Õ¹Ðüð½ Ìø(€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµÉ…ä´ØÀÀµˆ´Ðˆø(€€€€€€€€€€€€€Q¡¥ÌÝ¥±°Á•Éµ…¹•¹Ñ±äÉ•µ½Ù”å½ÕÈ…½Õ¹Ð…¹½É‘•È¡¥ÍÑ½Éä¸(€€€€€€€€€€€€ð½Àø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à…À´Ìˆø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•Ñ½¹™¥Éµ•±•Ñ”¡™…±Í”¥ô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à´ÄÁä´È¸ÔÉ½Õ¹‘•µ±œ‰½É‘•È‰½É‘•ÈµÉ…ä´ÌÀÀ™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÉ…ä´ÜÀÀˆ(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€…¹•°(€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€½¹±¥¬õí¡…¹‘±••±•Ñ•ô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à´ÄÁä´È¸ÔÉ½Õ¹‘•µ±œ™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÝ¡¥Ñ”‰œµÉ•´ÔÀÀˆ(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€í‘•±•Ñ•½Õ¹Ð¹¥ÍA•¹‘¥¹œ€ü€•±•Ñ¥¹œ¸¸¸œ€è€•±•Ñ”ô(€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½‘¥Øø(€€€€€€¥ô(€€€€ð½‘¥Øø(€€¤)ô(