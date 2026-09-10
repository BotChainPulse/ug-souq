import {
  Database,
  Eye,
  FileText,
  Globe2,
  Lock,
  MessageCircle,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE, WA_LINK } from '../lib/site'

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="flex items-center gap-2 font-extrabold">
        <Icon size={18} style={{ color: ORANGE }} />
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
          <ShieldCheck size={16} /> Privacy policy
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">UG Souq Privacy Policy</h1>
        <p className="mt-3 leading-relaxed text-neutral-600">
          This policy explains how UG Souq handles personal data through ugsouq.com and the UG
          Souq Android application when it becomes available. The website and app use the same UG
          Souq service, accounts and backend.
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          UG Souq is the data controller for this marketplace and operates from Kampala, Uganda.
          We follow Uganda&apos;s Data Protection and Privacy Act, 2019 and applicable regulations.
        </p>

        <div className="mt-10 space-y-6">
          <Section icon={Database} title="Information we collect">
            <p><b>Buyers:</b> name, phone number, delivery location or address, account preferences, order history, items purchased, amounts, payment method, payment status and transaction reference.</p>
            <p><b>Sellers and delivery partners:</b> shop or business details, owner name, contact details, district or location, identity evidence, TIN where applicable, payout method and payout number, contracts, listings and performance records.</p>
            <p><b>Marketing subscribers:</b> name, email address or phone number, selected communication channels, consent source and date, and unsubscribe status.</p>
            <p><b>Technical and security information:</b> our hosting provider may process IP address, browser or device information, request logs and error information needed to deliver and protect the service.</p>
            <p><b>Uploads:</b> product and advertising images submitted by sellers. A seller identity-document image is collected only through the protected verification form, with an explicit purpose notice and consent. It is never published in the storefront.</p>
          </Section>

          <Section icon={FileText} title="Why we use this information">
            <p>We use buyer and order information to create accounts, process and deliver orders, provide support, manage returns, prevent fraud and keep required transaction records.</p>
            <p>We use seller and delivery-partner information to review applications, operate marketplace listings, arrange payouts, enforce marketplace rules and protect customers.</p>
            <p>We use marketing details only for the channels a person actively selects. Consent can be withdrawn at any time.</p>
            <p>Where processing is necessary to provide a requested service, our basis is performance of that service or transaction. We also process information where required by law, for legitimate marketplace security and fraud-prevention needs, or with consent where consent is required.</p>
          </Section>

          <Section icon={Users} title="Who receives information">
            <p>Order details are provided only as necessary to the relevant seller, restaurant, delivery partner and support personnel.</p>
            <p>When enabled, Pesapal and the selected mobile-money or card provider process the minimum billing and transaction details needed to complete and verify a payment. UG Souq does not ask for or store a mobile-money PIN or full card credentials.</p>
            <p>Infrastructure, database and communication providers process information only where enabled and necessary to operate UG Souq. Their access must be limited by contract, technical controls and UG Souq&apos;s documented instructions.</p>
            <p>We may disclose information when required by Ugandan law, a valid court order or a competent public authority. We do not sell personal data.</p>
          </Section>

          <Section icon={Globe2} title="Storage and transfers outside Uganda">
            <p>Some technology providers may process or store information outside Uganda. Before enabling a provider, UG Souq must document its processing locations, contractual protections and security safeguards, and use consent or another lawful transfer basis where required.</p>
            <p>Our privacy-by-design standard also follows internationally recognised principles of lawfulness and transparency, purpose limitation, data minimisation, accuracy, storage limitation, security and accountability. Where UG Souq intentionally offers services to people protected by another jurisdiction, that jurisdiction&apos;s applicable requirements must be assessed before launch.</p>
          </Section>

          <Section icon={Lock} title="Security">
            <p>UG Souq uses HTTPS for information sent between a device and the service, restricts database and administrative access, and keeps payment-provider credentials outside the public application code.</p>
            <p>Seller identity numbers and document images are encrypted separately from the public seller profile. Opening an identity record requires administrator authorisation and creates an audit entry. General dashboard lists show only verification status and the final four characters.</p>
            <p>Never send UG Souq your mobile-money PIN, card PIN, password or identity-document photograph through ordinary chat.</p>
          </Section>

          <Section icon={Eye} title="Retention and your rights">
            <p>Account and profile information is retained while the account is active and then deleted or anonymised when it is no longer required. A seller&apos;s encrypted identity image and full identity number are scheduled for deletion 30 days after the verification decision. A non-reversible fingerprint, the final four characters, consent record, decision and audit history may be retained to prevent duplicate or fraudulent registrations and demonstrate accountability.</p>
            <p>Order, payout, fraud-prevention and payment records may be retained after account deletion where necessary for tax, accounting, disputes, refunds, security or other legal obligations. Information that is no longer needed must be securely deleted or anonymised.</p>
            <p>You may request access to your personal data, correction of inaccurate information, restriction or objection to certain processing, withdrawal of marketing consent, or deletion where the law permits. Requests are handled within the applicable legal period after identity verification.</p>
          </Section>

          <Section icon={Users} title="Children">
            <p>UG Souq is not designed for children under 18 to open seller, delivery-partner or payment accounts. If we learn that a child&apos;s personal information was submitted without the required parent or guardian authority, we will take steps to delete it.</p>
          </Section>

          <Section icon={Trash2} title="Account and data deletion">
            <p>Customers can request deletion from the account area and through our public deletion page. We verify the requester before deleting data so that another person cannot erase an account using only a known phone number.</p>
            <Link
              to="/delete-account"
              className="inline-flex min-h-11 items-center rounded-full px-5 font-bold text-white"
              style={{ background: ORANGE }}
            >
              Request account deletion
            </Link>
          </Section>
        </div>

        <div className="mt-8 rounded-2xl bg-neutral-900 p-6 text-white">
          <h2 className="flex items-center gap-2 font-extrabold">
            <MessageCircle size={18} style={{ color: ORANGE }} /> Privacy questions or complaints
          </h2>
          <p className="mt-2 text-sm text-neutral-300">
            Contact UG Souq through the official WhatsApp support channel. Include only the phone
            number registered to the account and the type of request. Do not send a PIN, password
            or identity-document image.
          </p>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-green-600 px-6 text-sm font-bold text-white"
          >
            <MessageCircle size={16} /> Contact privacy support
          </a>
        </div>

        <p className="mt-6 text-xs text-neutral-400">
          Updated: 10 September 2026 · UG Souq, Kampala, Uganda
        </p>
      </main>
      <Footer />
    </div>
  )
}
