import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  escrowTransactions, souqHubs, communityAgents, groupOrders, groupOrderParticipants,
  trustScores, sellerSubscriptions, orders, orderItems, sellers, products
} from "../db/schema";

const normPhone = (p: string) => p.replace(/[\s-]+/g, "").trim();

function requireAdmin(key: string) {
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin key" });
  }
}

export const trustRouter = createRouter({
  escrow: createRouter({
    hold: publicQuery
      .input(z.object({
        orderId: z.number(), buyerPhone: z.string().min(9),
        sellerId: z.number(), amount: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.buyerPhone);
        const [existing] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.orderId, input.orderId));
        if (existing) return { escrow: existing, message: "Escrow already exists" };

        const [sub] = await db.select().from(sellerSubscriptions).where(eq(sellerSubscriptions.sellerId, input.sellerId));
        const feeRate = sub && sub.tier !== "free" ? 0.02 : 0.04;
        const platformFee = Math.round(input.amount * feeRate);

        const [escrow] = await db.insert(escrowTransactions).values({
          orderId: input.orderId, buyerPhone: phone, sellerId: input.sellerId,
          amount: input.amount, platformFee, status: "held",
        }).$returningId();

        const [row] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, escrow.id));
        return { escrow: row, message: "Payment held in escrow. Seller will be paid upon delivery confirmation." };
      }),

    release: publicQuery
      .input(z.object({ orderId: z.number(), buyerPhone: z.string().min(9) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.buyerPhone);
        const [escrow] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.orderId, input.orderId));
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND", message: "Escrow not found" });
        if (escrow.buyerPhone !== phone) throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
        if (escrow.status !== "held") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only release held escrow" });

        await db.update(escrowTransactions).set({
          status: "released", releasedAt: new Date(), updatedAt: new Date()
        }).where(eq(escrowTransactions.id, escrow.id));

        await db.update(orders).set({ status: "delivered", deliveredAt: new Date() }).where(eq(orders.id, input.orderId));
        await updateSellerTrustScore(db, escrow.sellerId);
        return { message: "Delivery confirmed. Payment released to seller." };
      }),

    dispute: publicQuery
      .input(z.object({
        orderId: z.number(), buyerPhone: z.string().min(9), reason: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.buyerPhone);
        const [escrow] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.orderId, input.orderId));
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND", message: "Escrow not found" });
        if (escrow.buyerPhone !== phone) throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
        if (escrow.status !== "held") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only dispute held escrow" });

        await db.update(escrowTransactions).set({
          status: "disputed", disputedAt: new Date(), disputeReason: input.reason, updatedAt: new Date()
        }).where(eq(escrowTransactions.id, escrow.id));

        await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, input.orderId));
        return { message: "Dispute opened. Admin will review within 24 hours." };
      }),

    byPhone: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input }) => {
      const db = getDb();
      return db.select().from(escrowTransactions).where(eq(escrowTransactions.buyerPhone, normPhone(input.phone))).orderBy(desc(escrowTransactions.createdAt));
    }),

    bySeller: publicQuery.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      const db = getDb();
      return db.select().from(escrowTransactions).where(eq(escrowTransactions.sellerId, input.sellerId)).orderBy(desc(escrowTransactions.createdAt));
    }),
  }),

  hubs: createRouter({
    list: publicQuery.query(async () => {
      const db = getDb();
      return db.select().from(souqHubs).where(eq(souqHubs.isActive, true)).orderBy(souqHubs.town, souqHubs.name);
    }),
    byRegion: publicQuery.input(z.object({ region: z.string() })).query(async ({ input }) => {
      const db = getDb();
      return db.select().from(souqHubs).where(and(eq(souqHubs.isActive, true), eq(souqHubs.region, input.region))).orderBy(souqHubs.town);
    }),
    byTown: publicQuery.input(z.object({ town: z.string() })).query(async ({ input }) => {
      const db = getDb();
      return db.select().from(souqHubs).where(and(eq(souqHubs.isActive, true), eq(souqHubs.town, input.town))).orderBy(souqHubs.name);
    }),
    get: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = getDb();
      const [hub] = await db.select().from(souqHubs).where(eq(souqHubs.id, input.id));
      if (!hub) throw new TRPCError({ code: "NOT_FOUND", message: "Hub not found" });
      return hub;
    }),
    create: publicQuery
      .input(z.object({
        key: z.string(), name: z.string(),
        hubType: z.enum(["verification_center", "pickup_dropoff", "return_center", "full_service"]).default("full_service"),
        address: z.string(), town: z.string(), district: z.string(), region: z.string(),
        phone: z.string(), email: z.string().optional(), operatingHours: z.string().optional(),
        managerName: z.string().optional(), services: z.array(z.string()).default([]),
        coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        requireAdmin(input.key);
        const [row] = await db.insert(souqHubs).values({
          name: input.name, hubType: input.hubType, address: input.address, town: input.town,
          district: input.district, region: input.region, phone: input.phone, email: input.email,
          operatingHours: input.operatingHours, managerName: input.managerName,
          services: input.services, coordinates: input.coordinates,
        }).$returningId();
        return db.select().from(souqHubs).where(eq(souqHubs.id, row.id));
      }),
  }),

  agents: createRouter({
    list: publicQuery.query(async () => {
      const db = getDb();
      return db.select().from(communityAgents).where(eq(communityAgents.status, "active")).orderBy(communityAgents.town, communityAgents.name);
    }),
    byTown: publicQuery.input(z.object({ town: z.string() })).query(async ({ input }) => {
      const db = getDb();
      return db.select().from(communityAgents).where(and(eq(communityAgents.status, "active"), eq(communityAgents.town, input.town))).orderBy(communityAgents.name);
    }),
    applyAgent: publicQuery
      .input(z.object({
        name: z.string().min(2), phone: z.string().min(9),
        town: z.string(), district: z.string(), organization: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.phone);
        const [existing] = await db.select().from(communityAgents).where(eq(communityAgents.phone, phone));
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Already applied" });
        const [row] = await db.insert(communityAgents).values({
          name: input.name, phone, town: input.town, district: input.district,
          organization: input.organization, status: "pending",
        }).$returningId();
        return { message: "Application submitted. Review within 48 hours.", agentId: row.id };
      }),
    verify: publicQuery
      .input(z.object({ key: z.string(), agentId: z.number() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        requireAdmin(input.key);
        await db.update(communityAgents).set({ status: "active", verifiedAt: new Date() }).where(eq(communityAgents.id, input.agentId));
        return { message: "Agent verified" };
      }),
  }),

  groupOrders: createRouter({
    list: publicQuery.query(async () => {
      const db = getDb();
      const rows = await db.select().from(groupOrders).where(eq(groupOrders.status, "open")).orderBy(desc(groupOrders.createdAt));
      return Promise.all(rows.map(async (g) => {
        const [agent] = await db.select().from(communityAgents).where(eq(communityAgents.id, g.agentId));
        const [product] = await db.select().from(products).where(eq(products.id, g.productId));
        const [hub] = g.deliveryHubId ? await db.select().from(souqHubs).where(eq(souqHubs.id, g.deliveryHubId)) : [null];
        const participants = await db.select().from(groupOrderParticipants).where(eq(groupOrderParticipants.groupOrderId, g.id));
        return { ...g, agent, product, deliveryHub: hub, participants };
      }));
    }),
    create: publicQuery
      .input(z.object({
        agentPhone: z.string().min(9), productId: z.number(), title: z.string(),
        description: z.string().optional(), targetQuantity: z.number().min(2),
        unitPrice: z.number().positive(), originalPrice: z.number().positive(),
        deadline: z.string().or(z.date()), deliveryHubId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.agentPhone);
        const [agent] = await db.select().from(communityAgents).where(and(eq(communityAgents.phone, phone), eq(communityAgents.status, "active")));
        if (!agent) throw new TRPCError({ code: "FORBIDDEN", message: "Active agent required" });
        const deadline = typeof input.deadline === "string" ? new Date(input.deadline) : input.deadline;
        const [row] = await db.insert(groupOrders).values({
          agentId: agent.id, productId: input.productId, title: input.title,
          description: input.description, targetQuantity: input.targetQuantity,
          unitPrice: input.unitPrice, originalPrice: input.originalPrice, deadline,
          deliveryHubId: input.deliveryHubId,
        }).$returningId();
        return { groupOrderId: row.id };
      }),
    join: publicQuery
      .input(z.object({
        groupOrderId: z.number(), phone: z.string().min(9),
        name: z.string(), quantity: z.number().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const phone = normPhone(input.phone);
        const [group] = await db.select().from(groupOrders).where(eq(groupOrders.id, input.groupOrderId));
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group order not found" });
        if (group.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "No longer open" });
        if (group.currentQuantity + input.quantity > group.targetQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough spots" });
        const amountPaid = group.unitPrice * input.quantity;
        await db.insert(groupOrderParticipants).values({
          groupOrderId: input.groupOrderId, phone, name: input.name,
          quantity: input.quantity, amountPaid,
        });
        const newQty = group.currentQuantity + input.quantity;
        await db.update(groupOrders).set({
          currentQuantity: newQty, status: newQty >= group.targetQuantity ? "locked" : group.status, updatedAt: new Date(),
        }).where(eq(groupOrders.id, input.groupOrderId));
        return { message: "Joined successfully" };
      }),
  }),

  trustScores: createRouter({
    getBySeller: publicQuery.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      const db = getDb();
      const [score] = await db.select().from(trustScores).where(eq(trustScores.sellerId, input.sellerId));
      if (!score) {
        const [newScore] = await db.insert(trustScores).values({ sellerId: input.sellerId, verificationLevel: "basic", badge: "none" }).$returningId();
        return db.select().from(trustScores).where(eq(trustScores.id, newScore.id)).then(r => r[0]);
      }
      return score;
    }),
    adminVerify: publicQuery
      .input(z.object({
        key: z.string(), sellerId: z.number(), level: z.enum(["basic", "verified", "premium", "gold"]),
        checks: z.object({
          businessVerified: z.boolean().optional(), idVerified: z.boolean().optional(),
          locationVerified: z.boolean().optional(), stockVerified: z.boolean().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        requireAdmin(input.key);
        await db.update(sellers).set({ status: "approved", verified: true }).where(eq(sellers.id, input.sellerId));

        const [existing] = await db.select().from(trustScores).where(eq(trustScores.sellerId, input.sellerId));
        const badge = input.level === "gold" ? "gold" : input.level === "premium" ? "platinum" : input.level === "verified" ? "verified" : "none";
        const commissionRate = input.level === "premium" ? "5.00" : input.level === "verified" ? "7.00" : "10.00";
        const now = new Date(); const nextDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

        if (existing) {
          await db.update(trustScores).set({
            verificationLevel: input.level,
            businessVerified: input.checks?.businessVerified ?? existing.businessVerified,
            idVerified: input.checks?.idVerified ?? existing.idVerified,
            locationVerified: input.checks?.locationVerified ?? existing.locationVerified,
            stockVerified: input.checks?.stockVerified ?? existing.stockVerified,
            lastVerifiedAt: now, nextVerificationDue: nextDue, badge, updatedAt: now,
          }).where(eq(trustScores.sellerId, input.sellerId));
        } else {
          await db.insert(trustScores).values({
            sellerId: input.sellerId, verificationLevel: input.level,
            businessVerified: input.checks?.businessVerified ?? false,
            idVerified: input.checks?.idVerified ?? false,
            locationVerified: input.checks?.locationVerified ?? false,
            stockVerified: input.checks?.stockVerified ?? false,
            lastVerifiedAt: now, nextVerificationDue: nextDue, badge,
          });
        }
        await db.insert(sellerSubscriptions).values({
          sellerId: input.sellerId,
          tier: input.level === "premium" ? "premium" : input.level === "verified" ? "verified" : "free",
          commissionRate,
        }).onDuplicateKeyUpdate({
          set: { tier: input.level === "premium" ? "premium" : input.level === "verified" ? "verified" : "free", commissionRate, updatedAt: now }
        });
        return { message: `Seller verified as ${input.level}` };
      }),
    adminList: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
      const db = getDb();
      requireAdmin(input.key);
      const scores = await db.select().from(trustScores).orderBy(desc(trustScores.overallScore));
      const sellerRows = await db.select().from(sellers);
      const sellerMap = new Map(sellerRows.map(s => [Number(s.id), s]));
      return scores.map(s => ({
        ...s,
        sellerName: sellerMap.get(s.sellerId)?.shopName ?? "Unknown",
        sellerPhone: sellerMap.get(s.sellerId)?.phone ?? "",
      }));
    }),
  }),

  sellerFinance: publicQuery.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const escrowRecords = await db.select().from(escrowTransactions).where(eq(escrowTransactions.sellerId, input.sellerId));
    const heldFunds = escrowRecords.filter(e => e.status === "held" || e.status === "disputed").reduce((sum, e) => sum + e.amount, 0);
    const availableFunds = escrowRecords.filter(e => e.status === "released").reduce((sum, e) => sum + e.amount - e.platformFee, 0);
    const totalFees = escrowRecords.filter(e => e.status === "released").reduce((sum, e) => sum + e.platformFee, 0);
    return {
      heldFunds, availableFunds, totalFees,
      pendingOrders: escrowRecords.filter(e => e.status === "held").length,
      disputedOrders: escrowRecords.filter(e => e.status === "disputed").length,
      totalTransactions: escrowRecords.length,
    };
  }),

  adminEscrow: createRouter({
    list: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
      const db = getDb();
      requireAdmin(input.key);
      return db.select().from(escrowTransactions).orderBy(desc(escrowTransactions.createdAt));
    }),
    resolve: publicQuery
      .input(z.object({
        key: z.string(), escrowId: z.number(),
        resolution: z.enum(["buyer_favor", "seller_favor", "split", "cancelled"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = getDb();
        requireAdmin(input.key);
        const [escrow] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, input.escrowId));
        if (!escrow) throw new TRPCError({ code: "NOT_FOUND", message: "Escrow not found" });
        const newStatus = input.resolution === "cancelled" ? "cancelled" : input.resolution === "buyer_favor" ? "refunded" : "released";
        await db.update(escrowTransactions).set({
          status: newStatus, resolution: input.resolution,
          adminNotes: input.adminNotes, resolvedAt: new Date(), updatedAt: new Date(),
        }).where(eq(escrowTransactions.id, input.escrowId));
        const orderStatus = input.resolution === "buyer_favor" ? "cancelled" : input.resolution === "seller_favor" ? "delivered" : "cancelled";
        await db.update(orders).set({ status: orderStatus }).where(eq(orders.id, escrow.orderId));
        return { message: `Resolved: ${input.resolution}` };
      }),
  }),
});

async function updateSellerTrustScore(db: any, sellerId: number) {
  try {
    const allOrderItems = await db.select().from(orderItems).where(eq(orderItems.itemType, "product"));
    const productRows = await db.select().from(products);
    const productMap = new Map(productRows.map(p => [Number(p.id), p]));
    const sellerOrderIds = allOrderItems
      .filter((oi: any) => { const p = productMap.get(Number(oi.itemId)); return p && Number(p.sellerId) === sellerId; })
      .map((oi: any) => oi.orderId);
    const allOrders = await db.select().from(orders);
    const total = sellerOrderIds.length;
    const successful = allOrders.filter((o: any) => sellerOrderIds.includes(o.id) && o.status === "delivered").length;
    const overallScore = total > 0 ? ((successful / total) * 5).toFixed(2) : "5.00";
    const [existing] = await db.select().from(trustScores).where(eq(trustScores.sellerId, sellerId));
    if (existing) {
      await db.update(trustScores).set({
        totalTransactions: total, successfulTransactions: successful,
        overallScore, updatedAt: new Date(),
      }).where(eq(trustScores.sellerId, sellerId));
    }
  } catch (e) { console.error("Trust score update error:", e); }
}
