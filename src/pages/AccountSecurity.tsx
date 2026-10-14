import { Link } from 'react-router'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function AccountSecurityPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <Link to="/account" className="inline-flex items-center gap-2 font-bold text-emerald-800 underline">
          <ArrowLeft size={18} aria-hidden="true" /> Back to account
        </Link>
        <h1 className="text-3xl font-black text-neutral-900">Account Security</h1>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={20} className="text-emerald-700" aria-hidden="true" /> Security PIN
          </h2>
          <p className="mt-3 font-semibold text-neutral-800">PIN protection is not available yet.</p>
          <p className="mt-2 text-neutral-600">
            The previous Save PIN control did not save a PIN or add account protection.
            UGSouq will only offer PIN setup once it can enforce it.
          </p>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-bold">Your secured device</h2>
          <p className="mt-3 text-neutral-600">
            Private account actions require the credential held on the device where you registered.
            Your phone number alone cannot open private order history or manage your provider profile.
            Keep your device locked and avoid shared devices.
          </p>
          <p className="mt-3 text-neutral-600">
            If you lose access or change devices, contact support for ownership verification.
            Never share a password, PIN, OTP or account credential.
          </p>
          <Link to="/support" className="mt-4 inline-block font-bold text-emerald-800 underline">Get account recovery help</Link>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Lock size={20} className="text-neutral-500" aria-hidden="true" /> Two-Factor Authentication
          </h2>
          <p className="mt-3 text-neutral-600">Not available yet. No additional verification factor is enabled here.</p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
