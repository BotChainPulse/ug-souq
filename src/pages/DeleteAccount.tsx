import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE } from '../lib/site'
import { clearAccount, getAccount, saveAccount } from '../lib/account'
import { trpc } from '../providers/trpc'

export default function DeleteAccount() {
  const [account, setAccount] = useState(getAccount)
  const [confirmed, setConfirmed] = useState(false)
  const deletion = trpc.customers.deleteAccount.useMutation()
  const secureDevice = trpc.customers.register.useMutation()

  const secureThisDevice = () => {
    if (!account) return
    secureDevice.mutate(
      { name: account.name, phone: account.phone, email: account.email || undefined, location: account.location, deletionToken: account.deletionToken },
      {
        onSuccess: ({ customer, deletionToken }) => {
          const secured = { name: customer.name, phone: customer.phone, email: customer.email ?? account.email, location: customer.location ?? '', deletionToken }
          saveAccount(secured)
          setAccount(secured)
        },
      },
    )
  }

  const deleteNow = () => {
    if (!account?.deletionToken || !confirmed) return
    deletion.mutate(
      { phone: account.phone, deletionToken: account.deletionToken, confirmation: 'DELETE' },
      { onSuccess: () => clearAccount() },
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
          <Trash2 size={16} /> Account and data deletion
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Delete your UG Souq account</h1>
        <p className="mt-3 leading-relaxed text-neutral-600">
          This public page is for UG Souq website and Android-app users. A signed-in customer can
          delete the account immediately from the device that secured it.
        </p>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-extrabold">
            <ShieldCheck size={18} style={{ color: ORANGE }} /> How to request deletion
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-neutral-600">
            <li>Sign in or create the customer profile on this device through My Account.</li>
            <li>The device-held credential confirms that a person who merely knows your phone number cannot delete the account.</li>
            <li>Confirm deletion below. The customer profile and marketing consent are removed immediately.</li>
            <li>Limited transaction records may remain only where needed for active orders, refunds, fraud prevention, accounting or legal obligations.</li>
          </ol>
          {!account ? (
            <Link to="/account" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold text-white sm:w-auto" style={{ background: ORANGE }}>Open My Account</Link>
          ) : deletion.isSuccess ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Your customer account has been deleted. Marketing consent was withdrawn.</div>
          ) : (
            <div className="mt-6 space-y-4">
              <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-sm leading-relaxed">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-red-600" />
                I understand that account access is removed immediately and cannot be restored automatically.
              </label>
              <button type="button" onClick={deleteNow} disabled={!confirmed || !account.deletionToken || deletion.isPending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                <Trash2 size={17} /> {deletion.isPending ? 'Deleting account…' : 'Delete account now'}
              </button>
              {!account.deletionToken && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">This legacy profile needs a device credential before it can be deleted safely.</p>
                  <button type="button" onClick={secureThisDevice} disabled={secureDevice.isPending} className="mt-3 min-h-11 rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-50">{secureDevice.isPending ? 'Securing…' : 'Secure this device'}</button>
                  {secureDevice.error && <p className="mt-2 text-xs font-semibold text-red-700">{secureDevice.error.message}</p>}
                </div>
              )}
              {deletion.error && <p className="text-sm font-semibold text-red-700">{deletion.error.message}</p>}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-extrabold">
            <CheckCircle2 size={18} className="text-green-600" /> Information deleted
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            After verification, UG Souq deletes or anonymises the account profile and personal
            information that is no longer needed to provide the service. Marketing consent is
            withdrawn and the contact is placed on a minimal suppression list so that promotional
            messages do not restart.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="flex items-center gap-2 font-extrabold text-amber-900">
            <AlertTriangle size={18} /> Information that may be retained
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-900/80">
            Limited order, payment, refund, payout, dispute, fraud-prevention or accounting
            records may be retained when required by law or needed to establish or defend a legal
            claim. Access remains restricted, and the information is deleted or anonymised when
            the retention reason ends.
          </p>
        </section>

        <p className="mt-6 text-sm text-neutral-500">
          Never send a mobile-money PIN, card PIN, password or identity-document photograph in a
          deletion request. Read the complete <Link to="/privacy" className="font-bold underline">UG Souq Privacy Policy</Link>.
        </p>
      </main>
      <Footer />
    </div>
  )
}
