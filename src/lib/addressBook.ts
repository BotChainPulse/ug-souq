export type CustomerAddress = {
  id: string;
  label: "Home" | "Work" | "Other";
  address: string;
  phone: string;
  isDefault: boolean;
};

type AddressStorage = Pick<Storage, "getItem" | "setItem">;

function phoneKey(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? `0${digits.slice(3)}` : digits;
  return `ugsouq_addresses_v1_${local}`;
}

export function loadAddresses(
  storage: AddressStorage,
  accountPhone: string
): CustomerAddress[] {
  try {
    const parsed = JSON.parse(storage.getItem(phoneKey(accountPhone)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomerAddress =>
        typeof item?.id === "string" &&
        ["Home", "Work", "Other"].includes(item?.label) &&
        typeof item?.address === "string" &&
        typeof item?.phone === "string" &&
        typeof item?.isDefault === "boolean"
    );
  } catch {
    return [];
  }
}

export function saveAddresses(
  storage: AddressStorage,
  accountPhone: string,
  addresses: CustomerAddress[]
) {
  storage.setItem(phoneKey(accountPhone), JSON.stringify(addresses));
}

export function clearLocalAddresses(storage: Pick<Storage, "removeItem">, accountPhone: string) {
  storage.removeItem(phoneKey(accountPhone));
}

const ADDRESS_DEVICE_KEY = "ugsouq_address_device";

export function loadAddressDevice() {
  try {
    const token = localStorage.getItem(ADDRESS_DEVICE_KEY);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
  } catch {
    return "";
  }
}

export function saveAddressDevice(token: string) {
  try {
    if (token) localStorage.setItem(ADDRESS_DEVICE_KEY, token);
    else localStorage.removeItem(ADDRESS_DEVICE_KEY);
  } catch {
    // This browser can use the current link in memory until the page closes.
  }
}

export function validUgandanPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return /^(?:256|0)?(?:7|3)\d{8}$/.test(digits);
}
