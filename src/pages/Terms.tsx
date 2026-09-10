import Header from '../components/Header'
import Footer from '../components/Footer'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-bold text-lg">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-neutral-600 leading-relaxed">{children}</div>
    </section>
  )
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-extrabold">Terms &amp; Conditions</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated: 10 September 2026 · Governed by the laws of Uganda</p>

        <Section title="1. Who we are">
          <p>UG Souq ("UG Souq", "we", "us") is an online marketplace operated from Kampala, Uganda. We connect buyers with independent sellers and restaurants. By using UG Souq you agree to these Terms. If you do not agree, please do not use the platform.</p>
        </Section>

        <Section title="2. The marketplace role">
          <p>UG Souq is a marketplace, not the direct seller of most listed items. Products are sold by independent sellers and meals are prepared by independent restaurants. We facilitate the listing, ordering, payment coordination, and delivery of goods, and we verify sellers, but the contract of sale for each item is between you and the seller or restaurant.</p>
        </Section>

        <Section title="3. Orders and pricing">
          <p>All prices are shown in Uganda Shillings (UGX) and include listed delivery fees where applicable. When you place an order you will receive an order code (e.g. US-XXXXX) — keep it safe, as it is required to track your order together with your phone number.</p>
          <p>We or the seller may cancel an order if an item is out of stock, was mispriced in error, or if we suspect fraud. In that case any payment collected will be reversed in full.</p>
        </Section>

        <Section title="4. Payments">
          <p>We accept MTN Mobile Money, Airtel Money, and cash on delivery for eligible orders. Never share your mobile money PIN with anyone — UG Souq staff, riders, and sellers will never ask for it. Payment confirmations are matched to your order code.</p>
        </Section>

        <Section title="5. Delivery">
          <p>Estimated delivery times shown on product and restaurant pages are estimates, not guarantees. Risk in the goods passes to you on delivery. Please inspect items at the doorstep before accepting, and report visible damage immediately to the rider and via our WhatsApp support.</p>
        </Section>

        <Section title="6. Returns and refunds">
          <p>Returns are handled under our Returns policy: 7 days for eligible products in original condition, and within 2 hours of delivery for food quality issues. Approved refunds are sent to the same mobile money number used to pay, or via cash handover where the order was paid in cash.</p>
        </Section>

        <Section title="7. Sellers and verification">
          <p>Sellers must provide a valid National ID or passport, a verifiable business location, and (where applicable) a TIN. Verified sellers display a blue badge. Verification confirms identity and location checks were completed — it is not a guarantee of product quality, but unverified sellers are ranked lower and may be restricted.</p>
          <p>The Free seller plan includes up to five active or pending listing slots and a 7% marketplace commission on each seller item subtotal. Seller Pro is UGX 30,000 per 30 days, includes up to 50 listing slots, and reduces that commission to 5%. Delivery fees are excluded from seller commission. Paid advertising and verification are separate from Seller Pro.</p>
          <p>Sellers are responsible for the accuracy of their listings, lawful ownership of goods, and honouring warranties they advertise. Branded goods require supplier, invoice, serial-number or authorization evidence before publication. UG Souq may request further evidence, conduct test purchases, suspend a listing while investigating, cooperate with rights holders or competent authorities, and permanently remove sellers responsible for confirmed counterfeits.</p>
          <p>A blue badge means the seller&apos;s identity and stated business location passed UG Souq&apos;s review. It does not mean every product has been authenticated or guaranteed by UG Souq. Buyers can report a suspicious item through the product page without receiving the seller&apos;s private registration phone number.</p>
        </Section>

        <Section title="8. Prohibited items and conduct">
          <p>You may not list or buy counterfeit goods, stolen property, weapons, narcotics, or items illegal under Ugandan law. You may not use the platform to defraud, harass, or spam other users, or to scrape listings at scale without written permission.</p>
        </Section>

        <Section title="9. Affiliates">
          <p>Affiliates earn commission on qualifying orders made through their links or coupon codes. Self-referrals, fake orders, and cookie-stuffing are prohibited and lead to removal and forfeiture of unpaid commissions. Commissions are paid via mobile money per the affiliate program schedule.</p>
        </Section>

        <Section title="10. Liability">
          <p>To the extent permitted by law, UG Souq's liability for any claim arising from an order is limited to the value of that order. We are not liable for indirect losses. Nothing in these Terms limits your rights under Ugandan consumer protection law.</p>
        </Section>

        <Section title="11. Your data">
          <p>Your personal data is handled according to our Privacy &amp; Data Protection page, in line with the Data Protection and Privacy Act, 2019 (Uganda).</p>
        </Section>

        <Section title="12. Changes and contact">
          <p>We may update these Terms from time to time; the "last updated" date above shows the current version. Continued use after an update means you accept the new Terms. Questions can be sent via our WhatsApp support link in the footer.</p>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
