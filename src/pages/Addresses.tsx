import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, MapPin, Plus, Trash2, X } from "lucide-react";
import { ORANGE } from "../lib/site";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getAccount } from "../lib/account";
import { trpc } from "../providers/trpc";
import {
  loadAddresses,
  clearLocalAddresses,
  loadAddressDevice,
  saveAddressDevice,
  validUgandanPhone,
  type CustomerAddress,
} from "../lib/addressBook";

export default function AddressesPage() {
  const [account] = useState(getAccount);
  const owner = !!account?.deletionToken;
  const [deviceToken, setDeviceToken] = useState(loadAddressDevice);
  const hasAccess = owner || !!deviceToken;
  const access = owner ? { phone: account!.phone } : { deviceToken: deviceToken || undefined };
  const book = trpc.addressBook.list.useQuery(access, {
    enabled: hasAccess, retry: false, gcTime: 0, refetchOnMount: "always",
  });
  const addresses = book.isSuccess && book.isFetchedAfterMount ? book.data : [];
  const add = trpc.addressBook.add.useMutation();
  const remove = trpc.addressBook.remove.useMutation();
  const importSaved = trpc.addressBook.importFromDevice.useMutation();
  const issue = trpc.addressBook.issueLink.useMutation();
  const redeem = trpc.addressBook.redeemLink.useMutation();
  const revoke = trpc.addressBook.revokeLink.useMutation();
  const [savedHere, setSavedHere] = useState(() => account ? loadAddresses(localStorage, account.phone) : []);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState<CustomerAddress["label"]>("Home");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [code, setCode] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linkNotice, setLinkNotice] = useState("");
  const [error, setError] = useState("");

  const addAddress = () => {
    if (!hasAccess || add.isPending) return;
    if (address.trim().length < 5) {
      setError("Enter a complete delivery address or landmark.");
      return;
    }
    if (!validUgandanPhone(phone)) {
      setError("Enter a valid Ugandan phone number.");
      return;
    }
    setError("");
    add.mutate({ ...access, entry: { label, address, phone } }, {
      onSuccess: () => {
        void book.refetch();
        setLabel("Home");
        setAddress("");
        setPhone(account?.phone ?? "");
        setShowForm(false);
      },
      onError: err => setError(err.message),
    });
  };

  const importAddresses = () => {
    if (!account || !savedHere.length || importSaved.isPending) return;
    importSaved.mutate({ phone: account.phone, entries: savedHere.map(({ label, address, phone }) => ({ label, address, phone })) }, {
      onSuccess: () => {
        setSavedHere([]);
        try { clearLocalAddresses(localStorage, account.phone); } catch { /* Retrying is safe. */ }
        void book.refetch();
      },
    });
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
        {!hasAccess && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Open My Account on your original device to save addresses, or enter a link code from that device below.
            <Link to="/account" className="mt-3 block font-bold underline">Go to My Account</Link>
          </div>
        )}
        {hasAccess && book.isPending && <p role="status" className="p-4 text-sm">Loading saved addresses…</p>}
        {hasAccess && book.error && <p role="alert" className="p-4 text-sm text-red-700">{book.error.message}</p>}
        {remove.error && <p role="alert" className="p-4 text-sm text-red-700">{remove.error.message}</p>}

        {owner && book.isSuccess && savedHere.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm">You have {savedHere.length} addresses saved only on this device.</p>
            <button type="button" onClick={importAddresses} disabled={importSaved.isPending} className="mt-2 font-bold text-emerald-700">
              {importSaved.isPending ? "Importing…" : "Import addresses from this device"}
            </button>
            {importSaved.error && <p role="alert" className="mt-2 text-sm text-red-700">{importSaved.error.message}</p>}
          </div>
        )}

        {hasAccess && book.isSuccess && book.isFetchedAfterMount && addresses.length === 0 && !showForm && (
          <div className="rounded-xl bg-white p-5 text-center shadow-sm">
            <MapPin className="mx-auto text-gray-400" size={28} />
            <p className="mt-2 font-bold text-gray-900">No saved addresses</p>
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
                disabled={remove.isPending}
                onClick={() => remove.mutate({ ...access, id: addr.id }, { onSuccess: () => void book.refetch() })}
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
              disabled={add.isPending || !address.trim() || !phone.trim()}
              className="w-full py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}
            >
              {add.isPending ? "Saving…" : "Save Address"}
            </button>
            <p className="text-xs text-gray-500">
              Saved to your address book. You can access it on a linked device.
            </p>
          </div>
        )}

        {hasAccess && book.isSuccess && book.isFetchedAfterMount && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            aria-expanded={showForm}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium hover:border-orange-300 hover:text-orange-600"
          >
            <Plus size={20} /> Add New Address
          </button>
        )}
        <section className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900">{owner ? "Link another device" : "Link this device"}</h2>
          {owner ? (
            <>
              <p className="text-sm">Create a one-time code and enter it on My Addresses on your other device. It expires in five minutes and only grants address-book access.</p>
              <button type="button" disabled={issue.isPending || revoke.isPending} className="font-bold text-emerald-700"
                onClick={() => {
                  setLinkCode("");
                  setLinkNotice("");
                  issue.mutate(access, { onSuccess: data => setLinkCode(data.code) });
                }}>
                {issue.isPending ? "Creating…" : "Create a link code"}
              </button>
              {linkCode && <div className="space-y-2">
                <input aria-label="One-time address link code" readOnly value={linkCode} className="w-full rounded border p-2 text-sm" />
                <button type="button" className="text-sm font-bold text-emerald-700" onClick={() => {
                  if (!navigator.clipboard) { setLinkNotice("Select and copy the code manually."); return; }
                  void navigator.clipboard.writeText(linkCode).then(() => setLinkNotice("Code copied."), () => setLinkNotice("Select and copy the code manually."));
                }}>Copy code</button>
              </div>}
              <button type="button" disabled={issue.isPending || revoke.isPending} className="block text-sm text-red-700"
                onClick={() => revoke.mutate(access, { onSuccess: () => {
                  setLinkCode("");
                  setLinkNotice("The other device and any unused code have been disconnected.");
                } })}>
                Disconnect linked device
              </button>
              {linkNotice && <p role="status" className="text-sm">{linkNotice}</p>}
              {(issue.error || revoke.error) && <p role="alert" className="text-sm text-red-700">{(issue.error || revoke.error)?.message}</p>}
            </>
          ) : deviceToken ? (
            <>
              <p className="text-sm">A device link lasts 30 days. It gives access only to addresses.</p>
              <button type="button" className="text-sm text-red-700" onClick={() => {
                saveAddressDevice("");
                setDeviceToken("");
                setShowForm(false);
              }}>Forget link on this device</button>
            </>
          ) : (
            <form className="space-y-2" onSubmit={event => {
              event.preventDefault();
              redeem.mutate({ code }, { onSuccess: data => {
                saveAddressDevice(data.deviceToken);
                setDeviceToken(data.deviceToken);
                setCode("");
              } });
            }}>
              <label htmlFor="address-link-code" className="block text-sm">Code from your original device</label>
              <input id="address-link-code" autoComplete="off" autoCapitalize="none" spellCheck={false} value={code} maxLength={60}
                onChange={e => setCode(e.target.value)} className="w-full rounded border p-2 text-sm" />
              <button type="submit" disabled={redeem.isPending || code.trim().length !== 43} className="font-bold text-emerald-700 disabled:opacity-50">
                {redeem.isPending ? "Linking…" : "Link this device"}
              </button>
              {redeem.error && <p role="alert" className="text-sm text-red-700">{redeem.error.message}</p>}
            </form>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
