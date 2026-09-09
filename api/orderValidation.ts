import { TRPCError } from "@trpc/server";
import { DELIVERY_ZONES, PICKUP_POINTS } from "../src/lib/delivery";

export type OrderItemType = "product" | "listing" | "menu_item";

export type RequestedOrderItem = {
  itemType: OrderItemType;
  itemId: number;
  qty: number;
};

export function validateRequestedItems(items: RequestedOrderItem[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.itemType}:${item.itemId}`;
    if (seen.has(key)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Duplicate cart items are not allowed. Refresh the cart and try again.",
      });
    }
    seen.add(key);
  }
}

export function getServerDeliveryQuote(input: {
  zoneId: string;
  deliveryMethod: "door" | "pickup";
  stationId?: string;
  address: string;
}) {
  const zone = DELIVERY_ZONES.find((candidate) => candidate.id === input.zoneId);
  if (!zone) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid delivery region." });
  }

  if (input.deliveryMethod === "pickup") {
    const station = (PICKUP_POINTS[zone.id] ?? []).find(
      (candidate) => candidate.id === input.stationId,
    );
    if (!station) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid pickup station." });
    }
    return {
      deliveryFee: zone.pickupFee,
      address: `Pickup: ${station.name} (${station.detail}) — ${zone.label}`,
    };
  }

  const address = input.address.trim();
  if (address.length < 5) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a complete delivery address." });
  }
  return {
    deliveryFee: zone.doorFee,
    address: `${address} — ${zone.label}, door delivery`,
  };
}
