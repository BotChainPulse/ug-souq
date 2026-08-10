import { z } from "zod";
import { eq, desc, asc, like, or } from "drizzle-orm";
import { createRouter, publicQuery, COMMISSION_RATE } from "./middleware";
import { getDb } from "./queries/connection";
import { sellers, products, restaurants, menuItems, orders, orderItems, affiliates, listings, customers, deliveryPartners, sellerAdBookings, notifications } from "../db/schema";
import { adminRouter } from "./admin";
import { trustRouter } from "./trust";
import { bootstrapRouter } from "./bootstrap";
import { migrateRouter } from "./migrate";

function orderCode() {
  // Unambiguous alphabet: no O/0, I/1, L — buyers type these codes by hand
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return "US-" + c;
}

const normPhone = (p: string) => p.replace(/[\s-]+/g, "").trim();



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

  products: createRouter({
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
      const [row] = await db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(products.slug, input.slug));
      if (!row) return null;
      return {
        ...row.product,
        sellerName: row.seller.shopName,
        sellerVerified: row.seller.verified,
        sellerRating: row.seller.rating / 10,
        sellerPhone: row.seller.phone,
        sellerDistrict: row.seller.district,
        discount: row.product.oldPrice ? Math.round((1 - row.product.price / row.product.oldPrice) * 100) : 0,
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
        address: z.string().min(5),
        paymentMethod: z.enum(["mtn_momo", "airtel_money", "cash"]),
        items: z.array(z.object({
          itemType: z.enum(["product", "menu_item"]),
          itemId: z.number(),
          name: z.string(),
          price: z.number(),
          qty: z.number().min(1),
        })).min(1),
        deliveryFee: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
        const total = subtotal + input.deliveryFee;
        const phone = normPhone(input.phone);
        const commissionFee = Math.round(subtotal * COMMISSION_RATE);
        await upsertCustomer(db, input.customerName, phone, input.address);
        const [row] = await db.insert(orders).values({
          code: orderCode(),
          customerName: input.customerName,
          phone,
          address: input.address,
          paymentMethod: input.paymentMethod,
          subtotal,
          deliveryFee: input.deliveryFee,
          commissionFee,
          total,
        }).$returningId();
        await db.insert(orderItems).values(
          input.items.map((i) => ({ orderId: row.id, ...i })),
        );
        const [order] = await db.select().from(orders).where(eq(orders.id, row.id));
        return order;
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
        imageData: z.string().min(100, "A real photo of the item is required").max(1_500_000), // photo as data URL (required)
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
        const [seller] = await db.select().from(sellers).where(eq(sellers.phone, input.phone.trim()));
        if (!seller) throw new Error("No shop registered with this phone number. Register your shop first.");

        const amount = input.planType === "weekly" ? 25000 : 50000;
        const [row] = await db.insert(sellerAdBookings).values({
          sellerId: seller.id,
          planType: input.planType,
          amount,
          status: "booked",
          notes: input.notes ?? "Seller ad plan booking",
        }).$returningId();
        return { id: row.id, amount };
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
      return { customer: customer ?? null, orders: withItems };
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
        await db.delete(orders).where(eq(orders.phone, phone));
        await db.delete(customers).where(eq(customers.phone, phone));
        return { ok: true, removedOrders: myOrders.length };
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
