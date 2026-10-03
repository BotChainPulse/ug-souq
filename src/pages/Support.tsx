import { Link } from 'react-router'
import { CircleHelp, PackageSearch, RotateCcw, ShieldCheck, Store, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE } from '../lib/site'

const supportOptions = [
  { to: '/track', icon: PackageSearch, title: 'Track an order', description: 'Use your order code and the phone number used at checkout.' },
  { to: '/returns', icon: RotateCcw, title: 'Returns and refunds', description: 'Send a protected request directly to the administrator queue.' },
  { to: '/sell', icon: Store, title: 'Seller support', description: 'Review onboarding, verification and listing requirements.' },
  { to: '/privacy', icon: ShieldCheck, title: 'Privacy and data', description: 'Read how personal information is used and protected.' },
  { to: '/delete-account', icon: Trash2, title: 'Delete an account', description: 'Delete a signed-in customer account immediately.' },
]

export default function Support() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
          <CircleHelp size={17} /> UG Souq Help Centre
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">How can we help?</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-600">
          Use the protected tools below for order, return, seller and privacy matters. During the pilot, customer support is provided through these in-site tools.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {supportOptions.map(({ to, icon: Icon, title, description }) => (
            <Link key={to} to={to} className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={20} /></span>
              <h2 className="mt-4 font-extrabold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">{description}</p>
            </Link>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <h2 className="font-extrabold">Direct support inbox is being verified</h2>
          <p className="mt-1">The official support email will be published here only after inbound delivery has passed testing. Until then, use the secure in-site tools above. Never share a password, PIN, OTP or full payment details with anyone claiming to represent UG Souq.</p>
        </section>

        <Link to="/" className="mt-8 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold text-white" style={{ background: ORANGE }}>Return to the market</Link>
      </main>
      <Footer />
    </div>
  )
}
