import { getTableName } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountDeletionTokenHash } from "./accountDeletion";

const db = vi.hoisted(() => ({
  select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn(),
  rows: [] as unknown[][],
  book: "",
  link: {} as Record<string, unknown>,
}));

vi.mock("./queries/connection", () => ({ getDb: () => db }));
import { appRouter } from "./router";

const phone = "0700000001";
const ownerToken = "a".repeat(43);
const otherToken = "b".repeat(43);
const owner = { id: 1, phone, deletionTokenHash: accountDeletionTokenHash(ownerToken) };
const entry = { label: "Home" as const, address: "Example landmark, Kampala", phone };
const access = { phone };

function caller(token?: string, method = "POST") {
  return appRouter.createCaller({
    req: new Request("https://example.test/api/trpc", { method, headers: token ? { "x-ugsouq-customer-credential": token } : {} }),
    resHeaders: new Headers(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.rows = [];
  db.book = "";
  db.link = {};
  db.transaction.mockImplementation(async (fn) => fn(db));
  db.select.mockImplementation(() => {
    const rows = db.rows.shift() ?? [];
    const chain = {
      from: vi.fn(() => chain), where: vi.fn(() => chain), limit: vi.fn(() => chain), for: vi.fn(() => chain),
      then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
    };
    return chain;
  });
  db.insert.mockImplementation((table) => ({ values: (row: Record<string, unknown>) => ({
    onDuplicateKeyUpdate: async () => {
      if (getTableName(table) === "customer_address_books") db.book = String(row.addresses);
      else db.link = { ...db.link, ...row };
    },
  }) }));
  db.update.mockImplementation(() => ({ set: (values: Record<string, unknown>) => ({
    where: async () => { db.link = { ...db.link, ...values }; },
  }) }));
  db.delete.mockImplementation(() => ({ where: vi.fn(async () => []) }));
});

describe("private address book", () => {
  it("rejects phone-only access and a credential belonging to a different customer", async () => {
    await expect(caller().addressBook.list(access)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller(undefined, "GET").addressBook.list({ deviceToken: "c".repeat(43) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.transaction).not.toHaveBeenCalled();
    db.rows = [[owner]];
    await expect(caller(otherToken).addressBook.add({ ...access, entry })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("persists an address and reads it through an independent linked-device caller", async () => {
    db.rows = [[owner], []];
    const [saved] = await caller(ownerToken).addressBook.add({ ...access, entry });
    expect(saved).toMatchObject({ ...entry, isDefault: true });

    db.rows = [[owner]];
    const { code } = await caller(ownerToken).addressBook.issueLink(access);
    expect(db.link.pairingHash).toBe(accountDeletionTokenHash(code));
    expect(JSON.stringify(db.link)).not.toContain(code);
    db.rows = [[db.link], [owner], [db.link]];
    const { deviceToken } = await caller().addressBook.redeemLink({ code });
    expect(db.link.pairingHash).toBeNull();
    expect(db.link.deviceHash).toBe(accountDeletionTokenHash(deviceToken));
    expect(JSON.stringify(db.link)).not.toContain(deviceToken);
    db.rows = [[db.link], [owner], [db.link], [{ addresses: db.book }]];
    expect(await caller().addressBook.list({ deviceToken })).toEqual([saved]);
    await expect(caller().customers.me({ phone })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller().addressBook.issueLink({ deviceToken })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects expired, consumed, and replaced links after re-reading the locked row", async () => {
    const code = "c".repeat(43);
    const pairingHash = accountDeletionTokenHash(code);
    const link = { customerId: 1, pairingHash, pairingExpiresAt: new Date(Date.now() + 5_000) };
    for (const current of [{ ...link, pairingHash: null }, { ...link, pairingExpiresAt: new Date(0) }]) {
      db.rows = [[link], [owner], [current]];
      await expect(caller().addressBook.redeemLink({ code })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    const deviceToken = "d".repeat(43);
    const deviceHash = accountDeletionTokenHash(deviceToken);
    const device = { customerId: 1, deviceHash, deviceExpiresAt: new Date(Date.now() + 5_000) };
    for (const current of [[], [{ ...device, deviceHash: "new-hash" }], [{ ...device, deviceExpiresAt: new Date(0) }]]) {
      db.rows = [[device], [owner], current];
      await expect(caller().addressBook.list({ deviceToken })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(db.update).not.toHaveBeenCalled();
  });

  it("imports legacy entries idempotently and leaves one default after removal", async () => {
    db.rows = [[owner], []];
    const [a, b] = await caller(ownerToken).addressBook.importFromDevice({
      ...access, entries: [entry, { ...entry, phone: "+256700000001" }, { ...entry, label: "Work" }],
    });
    db.rows = [[owner], [{ addresses: db.book }]];
    expect(await caller(ownerToken).addressBook.remove({ ...access, id: a.id })).toEqual([{ ...b, isDefault: true }]);
  });

  it("rejects malformed addresses without opening a transaction", async () => {
    await expect(caller(ownerToken).addressBook.add({ ...access, entry: { ...entry, phone: "bad" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
