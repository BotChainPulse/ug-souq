import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, asc, gte, like, or, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createRouter, publicQuery, COMMISSION_RATE } from "./middleware";
import { getDb } from "./queries/connection";
import { sellers, products, restaurants, menuItems, orders, orderItems, affiliates, listings, customers, deliveryPartners, sellerAdBookings, notifications, plusMemberships, plusPayments, marketingSubscribers } from "../db/schema";
import { createPlusCheckout, plusPlan } from "./plus";
import { createOrderCheckout, releaseExpiredOrderReservations, serverDeliveryFee } from "./orderPayments";
import { adminRouter } from "./admin";
import { trustRouter } from "./trust";
import { bootstrapRouter } from "./bootstrap";
import { migrateRouter } from "./migrate";
import { syncDemoGroceries } from "./demoGroceries";

function orderCode() {
  // Unambiguous alphabet: no O/0, I/1, L — buyers type these codes by hand
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
          sellerPhone: seller.phone,
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
        sellerPhone: row.seller.phone,
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
        sellerPhone: seller.phone,
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
          sellerPhone: seller.phone,
          discount: listing.oldPrice ? Math.round((1 - listing.price / listing.oldPrice) * 100) : 0,
        }));
      return {
        seller: {
          id: seller.id,
          shopName: seller.shopName,
          verified: seller.verified,
          rating: seller.rating / 10,
          phone: seller.phone,
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
            sellerPhone: seller.phone,
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
            sellerPhone: seller.phone,
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
    create: publicQuery
      .input(z.object({
        customerName: z.string().min(2),
        phone: z.string().min(9),
        email: z.string().email().optional(),
        address: z.string().min(5),
        paymentMethod: z.enum(["flutterwave", "cash"]),
        deliveryZone: z.enum(["kampala", "upcountry"]),
        deliveryMethod: z.enum(["door", "pickup"]),
        items: z.array(z.object({
          itemType: z.enum(["product", "listing", "menu_item"]),
          itemId: z.number(),
          qty: z.number().int().min(1).max(99),
        })).min(1),
      }))
      .mutation(async ({ input }) => {
        if (input.paymentMethod === "flutterwave" && !input.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter an email address for the Flutterwave receipt." });
        }
        await releaseExpiredOrderReservations();
        const db = getDb();
        const phone = normPhone(input.phone);
        const order = await db.transaction(async (tx) => {
          const authoritativeItems: Array<{
            itemType: "product" | "listing" | "menu_item";
            itemId: number;
            name: string;
            price: number;
            qty: number;
          }> = [];

          for (const requested of input.items) {
            if (requested.itemType === "product") {
              const [product] = await tx.select().from(products).where(eq(products.id, requested.itemId));
              if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "A product in your cart is no longer available." });
              const stockResult: any = await tx.update(products)
                .set({ stock: sql`${products.stock} - ${requested.qty}` })
                .where(and(eq(products.id, product.id), gte(products.stock, requested.qty)));
              const affectedRows = Number(stockResult?.[0]?.affectedRows ?? stockResult?.affectedRows ?? 0);
              if (affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: `${product.name} does not have enough stock for this quantity.` });
              authoritativeItems.push({ itemType: "product", itemId: product.id, name: product.name, price: product.price, qty: requested.qty });
            } else if (requested.itemType === "listing") {
              const [listing] = await tx.select().from(listings).where(and(eq(listings.id, requested.itemId), eq(listings.status, "approved")));
              if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "A seller item in your cart is no longer available." });
              const stockResult: any = await tx.update(listings)
                .set({ stock: sql`${listings.stock} - ${requested.qty}` })
                .where(and(eq(listings.id, listing.id), eq(listings.status, "approved"), gte(listings.stock, requested.qty)));
              const affectedRows = Number(stockResult?.[0]?.affectedRows ?? stockResult?.affectedRows ?? 0);
              if (affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: `${listing.name} does not have enough stock for this quantity.` });
              authoritativeItems.push({ itemType: "listing", itemId: listing.id, name: listing.name, price: listing.price, qty: requested.qty });
            } else {
              const [menuItem] = await tx.select().from(menuItems).where(eq(menuItems.id, requested.itemId));
              if (!menuItem) throw new TRPCError({ code: "NOT_FOUND", message: "A food item in your cart is no longer available." });
              authoritativeItems.push({ itemType: "menu_item", itemId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: requested.qty });
            }
          }

          await upsertCustomer(tx, input.customerName.trim(), phone, input.address);
          const [customer] = await tx.select().from(customers).where(eq(customers.phone, phone));
          const [membership] = customer
            ? await tx.select().from(plusMemberships).where(eq(plusMemberships.customerId, customer.id))
            : [];
          const plusActive = Boolean(membership?.status === "active" && membership.expiresAt && membership.expiresAt > new Date());
          const subtotal = authoritativeItems.reduce((sum, item) => sum + item.price * item.qty, 0);
          const deliveryFee = serverDeliveryFee(input.deliveryZone, input.deliveryMethod, plusActive);
          const commissionFee = Math.round(subtotal * COMMISSION_RATE);
          const total = subtotal + deliveryFee;
          const isCash = input.paymentMethod === "cash";
          const [row] = await tx.insert(orders).values({
            code: orderCode(), customerName: input.customerName.trim(), phone,
            email: input.email?.toLowerCase() ?? null, address: input.address,
            paymentMethod: input.paymentMethod, paymentStatus: isCash ? "unpaid" : "pending",
            inventoryStatus: isCash ? "committed" : "reserved",
            reservationExpiresAt: isCash ? null : new Date(Date.now() + 60 * 60 * 1000),
            subtotal, deliveryFee, commissionFee, total,
          }).$returningId();
          await tx.insert(orderItems).values(authoritativeItems.map((item) => ({ orderId: row.id, ...item })));
          const [created] = await tx.select().from(orders).where(eq(orders.id, row.id));
          return created;
        });

        if (input.paymentMethod === "cash") return { order, checkoutUrl: null };
        const checkout = await createOrderCheckout({ order, email: input.email! });
        return { order, checkoutUrl: checkout.checkoutUrl };
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
    // Buyer says "I've sent the MoMo/Airtel money" — we hold the order as pending_confirmation until admin verifies
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
        if (order.paymentMethod === "cash") throw new Error("This order is cash on delivery — no mobile payment needed.");
        if (order.paymentStatus === "paid") return { ok: true, already: true };
        await db.update(orders).set({ paymentStatus: "pending_confirmation", paymentRef: input.ref.trim() }).where(eq(orders.id, order.id));
        return { ok: true, already: false };
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
    register: publicQuery
      .input(z.object({
        shopName: z.string().min(2),
        ownerName: z.string().min(2),
        phone: z.string().min(9),
        email: z.string().optional(),
        idType: z.string(),
        idNumber: z.string().min(3),
        idPhotoName: z.string(),
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
        const [row] = await db.insert(sellers).values({
          ...input,
          status: "pending",
          commissionTermsAccepted: true,
          sellerContractAccepted: true,
          commissionTermsAcceptedAt: new Date(),
          sellerContractAcceptedAt: new Date(),
        }).$returningId();
        return { id: row.id };
      }),
    lookup: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      const phone = input.phone.trim();
      const [row] = await db.select().from(sellers).where(eq(sellers.phone, phone));
      if (!row) return null;
      const myListings = await db.select().from(listings).where(eq(listings.sellerId, row.id)).orderBy(desc(listings.createdAt));
      return { ...row, listings: myListings };
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
        imageNote: z.string().optional(),
        imageData: z.string().min(100, "A real photo of the item is required").max(2_000_000, "Photo is too large to save"),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [seller] = await db.select().from(sellers).where(eq(sellers.phone, input.phone.trim()));
        if (!seller) throw new Error("No shop registered with this phone number. Register your shop first.");
        if (seller.status !== "approved") throw new Error("Your shop must be approved before you can list items.");
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
        planType: z.enum(["weekly", "monthly"]),
        notes: z.string().optional(),
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
        if (!sellerListings.some((listing) => listing.status === "approved")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You need at least one approved product listing before booking an advert." });
        }

        const existingBookings = await db.select().from(sellerAdBookings).where(eq(sellerAdBookings.sellerId, seller.id));
        const openBooking = existingBookings.find((booking) => ["booked", "paid", "active"].includes(booking.status));
        if (openBooking) {
          throw new TRPCError({ code: "CONFLICT", message: `Your shop already has advert booking AD-${openBooking.id} (${openBooking.status}).` });
        }

        const amount = input.planType === "weekly" ? 25000 : 50000;
        const [row] = await db.insert(sellerAdBookings).values({
          sellerId: seller.id,
          planType: input.planType,
          amount,
          status: "booked",
          notes: input.notes ?? "Seller ad plan booking",
        }).$returningId();
        return { id: row.id, reference: `AD-${row.id}`, amount, shopName: seller.shopName, planType: input.planType };
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
    // Profile + full order history — the buyer's account home
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
    // Buyer deletes their account: customer record + all their orders are removed
    deleteAccount: publicQuery
      .input(z.object({ phone: z.string().min(9) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.phone);
        const myOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.phone, phone));
        for (const o of myOrders) {
          await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
        }
        const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
        if (customer) {
          await db.delete(plusPayments).where(eq(plusPayments.customerId, customer.id));
          await db.delete(plusMemberships).where(eq(plusMemberships.customerId, customer.id));
        }
        await db.delete(orders).where(eq(orders.phone, phone));
        await db.delete(customers).where(eq(customers.phone, phone));
        return { ok: true, removedOrders: myOrders.length };
      }),
  }),

  plus: createRouter({
    plan: publicQuery.query(() => plusPlan),
    // Creates a hosted Flutterwave payment. No membership is activated here: only verified provider results can do that.
    startCheckout: publicQuery
      .input(z.object({ phone: z.string().min(9), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [customer] = await db.select().from(customers).where(eq(customers.phone, normPhone(input.phone)));
        if (!customer) throw new Error("Create your UG Souq account before joining Plus.");
        const [membership] = await db.select().from(plusMemberships).where(eq(plusMemberships.customerId, customer.id));
        if (membership?.status === "active" && membership.expiresAt && membership.expiresAt > new Date()) {
          return { alreadyActive: true, expiresAt: membership.expiresAt };
        }
        return { alreadyActive: false, ...(await createPlusCheckout({ customer, email: input.email.trim().toLowerCase() })) };
      }),
    status: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      const [customer] = await db.select().from(customers).where(eq(customers.phone, normPhone(input.phone)));
      if (!customer) return { membership: null, latestPayment: null };
      const [membership] = await db.select().from(plusMemberships).where(eq(plusMemberships.customerId, customer.id));
      const [latestPayment] = await db.select().from(plusPayments).where(eq(plusPayments.customerId, customer.id)).orderBy(desc(plusPayments.createdAt)).limit(1);
      const active = membership && membership.status === "active" && membership.expiresAt && membership.expiresAt > new Date() ? membership : null;
      return { membership: active, membershipRecord: membership ?? null, latestPayment: latestPayment ?? null };
    }),
  }),

  affiliates: createRouter({
    join: publicQuery
      .input(z.object({ name: z.string().min(2), phone: z.string().min(9), channel: z.string() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const code = "AFF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        await db.insert(affiliates).values({ ...input, code });
        return { code };
      }),
  }),
});

export type AppRouter = typeof appRouter;
