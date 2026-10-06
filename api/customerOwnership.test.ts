import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountDeletionTokenHash } from "./accountDeletion";

const state = vi.hoisted(() => ({ rows: [] as any[][], select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn() }));
vi.mock("./queries/connection", () => ({ getDb: () => state }));
import { appRouter } from "./router";

const tokenA = "a".repeat(43);
const tokenB = "b".repeat(43);
const customerA = { id: 1, phone: "0700000001", name: "Test A", deletionTokenHash: accountDeletionTokenHash(tokenA) };
const customerB = { id: 2, phone: "0700000002", name: "Test B", deletionTokenHash: accountDeletionTokenHash(tokenB) };
const orderA = { id: 11, code: "US-TESTA", phone: customerA.phone, customerName: "Test A", customerEmail: "a@example.test", address: "Test address", paymentRef: "PRIVATE-PAYMENT", payoutRef: "PRIVATE-PAYOUT", deliveryNotes: "PRIVATE-NOTE", status: "placed", paymentStatus: "unpaid", paymentMethod: "cash", total: 10000, subtotal: 9000, deliveryFee: 1000, createdAt: new Date() };

function caller(token?: string) {
  return appRouter.createCaller({ req: new Request("https://example.test/api/trpc", { headers: token ? { "x-ugsouq-customer-credential": token } : {} }), resHeaders: new Headers() });
}

beforeEach(() => {
  vi.clearAllMocks(); state.rows = [];
  state.select.mockImplementation(() => {
    const rows = state.rows.shift() ?? [];
    const chain: any = {};
    for (const method of ["from", "where", "orderBy", "limit"]) chain[method] = () => chain;
    chain.then = (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject);
    return chain;
  });
});

describe("customer order ownership — isolated synthetic accounts", () => {
  it("blocks phone-only order history before any database read", async () => {
    await expect(caller().orders.byPhone({ phone: customerA.phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.select).not.toHaveBeenCalled();
  });
  it("rejects A's credential for B's history", async () => {
    state.rows = [[customerB]];
    await expect(caller(tokenA).orders.byPhone({ phone: customerB.phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.select).toHaveBeenCalledTimes(1);
  });
  it("rejects B's credential for A's history", async () => {
    state.rows = [[customerA]];
    await expect(caller(tokenB).orders.byPhone({ phone: customerA.phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("returns A's history with a valid credential and omits internal/payment fields", async () => {
    state.rows = [[customerA], [{ id: 1 }], [orderA], [{ id: 7, name: "Test product", qty: 1, price: 9000 }]];
    const result = await caller(tokenA).orders.byPhone({ phone: customerA.phone });
    expect(result).toHaveLength(1);
    expect(state.update).not.toHaveBeenCalled(); expect(state.transaction).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ code: "US-TESTA", total: 10000 });
    for (const field of ["paymentRef", "payoutRef", "deliveryNotes", "customerEmail", "customerName", "phone"]) expect(result[0]).not.toHaveProperty(field);
  });
  it("also blocks phone-only returns and cancellation-status reads", async () => {
    await expect(caller().buyerOrders.requestReturn({ phone: customerA.phone, code: "US-TESTA", reason: "Test return" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller().buyerOrders.cancellationStatuses({ phone: customerA.phone, codes: ["US-TESTA"] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.select).not.toHaveBeenCalled(); expect(state.insert).not.toHaveBeenCalled();
  });
  it("rejects a revoked/deleted account credential", async () => {
    state.rows = [[]];
    await expect(caller(tokenA).orders.byPhone({ phone: customerA.phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("protects the alternate profile/history and Plus endpoints", async () => {
    await expect(caller().customers.me({ phone: customerA.phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller().plus.status({ phone: customerA.phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.select).not.toHaveBeenCalled();
  });
  it("blocks cross-customer cancellation before reading or writing orders", async () => {
    state.rows = [[customerB]];
    await expect(caller(tokenA).buyerOrders.cancel({ phone: customerB.phone, code: "US-TESTB", reason: "Test cancellation" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.select).toHaveBeenCalledTimes(1);
    expect(state.update).not.toHaveBeenCalled(); expect(state.transaction).not.toHaveBeenCalled();
  });
  it("rejects stale-cancellation calls from old cached clients, even with valid credentials", async () => {
    await expect(caller(tokenA).buyerOrders.expireStale({ phone: customerA.phone })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.select).not.toHaveBeenCalled(); expect(state.transaction).not.toHaveBeenCalled();
  });
  it("cannot claim a legacy unsecured account by registering its phone", async () => {
    state.rows = [[{ ...customerA, deletionTokenHash: null }], []];
    await expect(caller().customers.register({ phone: customerA.phone, name: "Impersonator", location: "Test location" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.insert).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
  });
  it("cannot recreate a deleted account and inherit its retained order history", async () => {
    state.rows = [[], [orderA]];
    await expect(caller().customers.register({ phone: customerA.phone, name: "Impersonator", location: "Test location" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.insert).not.toHaveBeenCalled();
  });
});
