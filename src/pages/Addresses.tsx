import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, MapPin, Plus, Trash2, X } from "lucide-react";
import { ORANGE } from "../lib/site";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getAccount } from "../lib/account";
import {
  loadAddresses,
  saveAddresses,
  validUgandanPhone,
  type CustomerAddress,
} from "../lib/addressBook";

export default function AddressesPage() {
  const account = getAccount();
  const [addresses, setAddresses] = useState<CustomerAddress[]>(() =>
    account ? loadAddresses(localStorage, account.phone) : []
  );
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState<CustomerAddress["label"]>("Home");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [error, setError] = useState("");

  const updateAddresses = (next: CustomerAddress[]) => {
    if (!account) return;
    setAddresses(next);
    saveAddresses(localStorage, account.phone, next);
  };

  const addAddress = () => {
    if (!account) return;
    if (address.trim().length < 5) {
      setError("Enter a complete delivery address or landmark.");
      return;
    }
    if (!validUgandanPhone(phone)) {
      setError("Enter a valid Ugandan phone number.");
      return;
    }
    const next = [
      ...addresses,
      {
        id: crypto.randomUUID(),
        label,
        address: address.trim(),
        phone: phone.trim(),
        isDefault: addresses.length === 0,
      },
    ];
    updateAddresses(next);
    setLabel("Home");
    setAddress("");
    setPhone(account.phone);
    setError("");
    setShowForm(false);
  };

  const removeAddress = (id: string) => {
    const remaining = addresses.filter(item => item.id !== id);
    if (remaining.length > 0 && !remaining.some(item => item.isDefault)) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    updateAddresses(remaining);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account">
          <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">My Addresses</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {!account && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Create or sign in to your account before saving a delivery address.
            <Link to="/account" className="mt-3 block font-bold underline">
              Go to My Account
            </Link>
          </div>
        )}

        {account && addresses.length === 0 && !showForm && (
          <div className="rounded-xl bg-white p-5 text-center shadow-sm">
            <MapPin className="mx-auto text-gray-400" size={28} />
            <p className="mt-2 font-bold text-gray-900">No saved addresses</p>
            <p className="mt-1 text-sm text-gray-500">
              Add the delivery location you want to use at checkout.
            </p>
          </div>
        )}

        {addresses.map(addr => (
          <div key={addr.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "#fff3e6" }}
                >
                  <MapPin size={20} style={{ color: ORANGE }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">
                      {addr.label}
                    </p>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{addr.address}</p>
                  <p className="text-xs text-gray-400">{addr.phone}</p>
                </div>
              </div>
              <button
                onClick={() => removeAddress(addr.id)}
                className="p-2 text-gray-400 hover:text-red-500"
                aria-label={`Remove ${addr.label} address`}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {showForm && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add New Address</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400"
                aria-label="Close address form"
              >
                <X size={20} />
              </button>
            </div>
            <label htmlFor="address-label" className="text-xs font-semibold text-gray-700">
              Address type
            </label>
            <select
              id="address-label"
              value={label}
              onChange={e =>
                setLabel(e.target.value as CustomerAddress["label"])
              }
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm"
            >
              <option>Home</option>
              <option>Work</option>
              <option>Other</option>
            </select>
            <label htmlFor="delivery-address" className="text-xs font-semibold text-gray-700">
              Delivery address
            </label>
            <input
              id="delivery-address"
              value={address}
              onChange={e => {
                setAddress(e.target.value);
                setError("");
              }}
              autoComplete="street-address"
              placeholder="District, area, street and landmark"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
            />
            <label htmlFor="delivery-phone" className="text-xs font-semibold text-gray-700">
              Contact phone
            </label>
            <input
              id="delivery-phone"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                setError("");
              }}
              inputMode="tel"
              autoComplete="tel"
              placeholder="Phone number"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
            />
            {error && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {error}
              </p>
            )}
            <button
              onClick={addAddress}
              disabled={!address.trim() || !phone.trim()}
              className="w-full py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}
            >
              Save Address
            </button>
            <p className="text-xs text-gray-500">
              Saved on this device until verified account syncing is introduced.
            </p>
          </div>
        )}

        {account && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            aria-expanded={showForm}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium hover:border-orange-300 hover:text-orange-600"
          >
            <Plus size={20} /> Add New Address
          </button>
        )}
      </div>
      <Footer />
    </div>
  );
}
