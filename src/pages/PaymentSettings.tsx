import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, CreditCard, Plus, ShieldCheck, X } from "lucide-react";
import { ORANGE } from "../lib/site";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PaymentSettingsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account">
          <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Payment Methods</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <CreditCard className="mx-auto text-gray-400" size={30} />
          <p className="mt-2 font-bold text-gray-900">
            No saved payment methods
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Choose an available payment method securely when you check out.
          </p>
        </div>

        {showForm && (
          <div
            className="bg-white rounded-xl p-4 shadow-sm space-y-3"
            role="status"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add Payment Method</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400"
                aria-label="Close payment form"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3 text-green-900">
              <ShieldCheck size={21} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">
                  Secure saving will open with Pesapal
                </p>
                <p className="mt-1 text-xs leading-5">
                  UGSouq will only save a provider-issued token after Pesapal
                  merchant activation. Card numbers, Mobile Money PINs and OTPs
                  will never be stored here.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              For now, select your available method during checkout. Cash on
              delivery remains subject to the order and delivery area.
            </p>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            aria-expanded={showForm}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium hover:border-orange-300 hover:text-orange-600"
          >
            <Plus size={20} /> Add Payment Method
          </button>
        )}
      </div>
      <Footer />
    </div>
  );
}
