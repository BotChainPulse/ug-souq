import { describe, expect, it } from "vitest";
import { loadAddresses, saveAddresses, validUgandanPhone } from "./addressBook";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("address book", () => {
  it("persists addresses for equivalent local and international account numbers", () => {
    const storage = memoryStorage();
    const addresses = [
      {
        id: "one",
        label: "Home" as const,
        address: "Kampala Road, Kampala",
        phone: "0700000000",
        isDefault: true,
      },
    ];
    saveAddresses(storage, "+256 700 000 000", addresses);
    expect(loadAddresses(storage, "0700-000-000")).toEqual(addresses);
  });

  it("ignores malformed stored entries", () => {
    const storage = memoryStorage();
    storage.setItem(
      "ugsouq_addresses_v1_0700000000",
      JSON.stringify([{ id: 1, label: "Home" }])
    );
    expect(loadAddresses(storage, "0700000000")).toEqual([]);
  });

  it("accepts common Ugandan mobile formats and rejects short numbers", () => {
    expect(validUgandanPhone("0700 000 000")).toBe(true);
    expect(validUgandanPhone("+256 700 000 000")).toBe(true);
    expect(validUgandanPhone("700000000")).toBe(true);
    expect(validUgandanPhone("0700")).toBe(false);
  });
});
