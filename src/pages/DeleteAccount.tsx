import { AlertTriangle, CheckCircle2, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE, WHATSAPP_INTL } from '../lib/site'

const deletionMessage = encodeURIComponent(
  'Hi UG Souq. I want to request deletion of my UG Souq account and associated personal data. My registered phone number is: '
)
const deletionLink = `https://wa.me/${WHATSAPP_INTL}?text=${deletionMessage}`

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
          <Trash2 size={16} /> Account and data deletion
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Delete your UG Souq account</h1>
        <p className="mt-3 leading-relaxed text-neutral-600">
          This public page is for UG Souq website and Android-app users. You can start a deletion
          request without reinstalling the app.
        </p>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-extrabold">
            <ShieldCheck size={18} style={{ color: ORANGE }} /> How to request deletion
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-neutral-600">
            <li>Open the official UG Souq WhatsApp conversation using the button below.</li>
            <li>Provide the phone number registered to the account and say whether it is a buyer, seller, affiliate or delivery-partner account.</li>
            <li>Complete the identity check requested by support. This prevents another person from deleting your account using a phone number they know.</li>
            <li>We will confirm when the request has been completed or explain any information that must temporarily be retained by law.</li>
          </ol>
          <a
            href={deletionLink}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white sm:w-auto"
          >
            <MessageCircle size={17} /> Start deletion request
          </a>
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
