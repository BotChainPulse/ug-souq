import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, MapPin, Package, ShieldCheck, MessageCircle, Clock } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE, WA_LINK } from '../lib/site'
import { trpc } from '@/providers/trpc'

export default function Boda() {
  const [partner, setPartner] = useState({
    fullName: '', phone: '', area: '', vehicleType: 'boda', payoutMethod: 'mtn_momo', payoutNumber: '',
    contractAccepted: false, deliveryShareAccepted: false,
  })
  const registerPartner = trpc.delivery.registerPartner.useMutation()

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <section className="bg-[#fdf3ea]">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl" style={{ background: ORANGE }}>
            <Send size={30} className="text-white" />
          </span>
          <h1 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight">Boda Send</h1>
          <p className="mt-3 text-neutral-600 max-w-xl mx-auto">
            Fast boda-boda delivery for UG Souq orders and your own parcels — same-day within Kampala, next-day to major towns.
          </p>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-full" style={{ background: ORANGE }}>
            <MessageCircle size={16} /> Book a rider on WhatsApp
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 grid sm:grid-cols-2 gap-4">
        {[
          { icon: Clock, t: 'Same-day in Kampala', d: 'Order before 3pm and your parcel moves the same day — average 45 minutes across town.' },
          { icon: MapPin, t: 'Upcountry in 1–3 days', d: 'Jinja, Mbarara, Gulu, Mbale, Masaka and more via boda + bus courier partners.' },
          { icon: Package, t: 'For sellers', d: 'Dispatch customer orders straight from your shop. Bulk rates for 10+ deliveries a week.' },
          { icon: ShieldCheck, t: 'Protected parcels', d: 'Every Boda Send parcel is registered and trackable. Damaged or lost? You are covered.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-6 flex gap-4">
            <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
            <div>
              <h3 className="font-bold text-sm">{t}</h3>
              <p className="text-sm text-neutral-600 mt-1">{d}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-14">
        <div className="bg-neutral-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-extrabold">Already have an order?</h3>
            <p className="text-sm text-neutral-300 mt-1">Track it with your order code and phone number.</p>
          </div>
          <Link to="/track" className="text-sm font-bold px-5 py-2.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-200 whitespace-nowrap text-center">Track your order →</Link>
        </div>

        <div className="mt-5 bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-extrabold text-lg">Become a delivery partner</h3>
          <p className="text-sm text-neutral-600 mt-1">Sign the delivery contract and join Boda Send dispatch network.</p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <input value={partner.fullName} onChange={(e) => setPartner((p) => ({ ...p, fullName: e.target.value }))} placeholder="Full name" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
            <input value={partner.phone} onChange={(e) => setPartner((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
            <input value={partner.area} onChange={(e) => setPartner((p) => ({ ...p, area: e.target.value }))} placeholder="Primary area (e.g. Ntinda)" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
            <select value={partner.vehicleType} onChange={(e) => setPartner((p) => ({ ...p, vehicleType: e.target.value }))} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white">
              <option value="boda">Boda</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
            </select>
            <select value={partner.payoutMethod} onChange={(e) => setPartner((p) => ({ ...p, payoutMethod: e.target.value }))} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white">
              <option value="mtn_momo">MTN MoMo</option>
              <option value="airtel_money">Airtel Money</option>
            </select>
            <input value={partner.payoutNumber} onChange={(e) => setPartner((p) => ({ ...p, payoutNumber: e.target.value }))} placeholder="Payout number" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
          </div>

          <div className="mt-4 space-y-2 text-sm text-neutral-700">
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={partner.contractAccepted} onChange={(e) => setPartner((p) => ({ ...p, contractAccepted: e.target.checked }))} className="mt-1 accent-orange-600" />
              I accept the UG Souq delivery partner contract, service standards, and anti-fraud policy.
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={partner.deliveryShareAccepted} onChange={(e) => setPartner((p) => ({ ...p, deliveryShareAccepted: e.target.checked }))} className="mt-1 accent-orange-600" />
              I accept that UG Souq retains 10% of each delivery fee as platform delivery income.
            </label>
          </div>

          <button
            disabled={registerPartner.isPending || !partner.fullName || !partner.phone || !partner.area || !partner.payoutNumber || !partner.contractAccepted || !partner.deliveryShareAccepted}
            onClick={async () => {
              try {
                await registerPartner.mutateAsync({
                  fullName: partner.fullName,
                  phone: partner.phone,
                  area: partner.area,
                  vehicleType: partner.vehicleType as 'boda' | 'car' | 'van' | 'truck',
                  payoutMethod: partner.payoutMethod as 'mtn_momo' | 'airtel_money',
                  payoutNumber: partner.payoutNumber,
                  contractAccepted: partner.contractAccepted,
                  deliveryShareAccepted: partner.deliveryShareAccepted,
                })
                setPartner({ fullName: '', phone: '', area: '', vehicleType: 'boda', payoutMethod: 'mtn_momo', payoutNumber: '', contractAccepted: false, deliveryShareAccepted: false })
              } catch {}
            }}
            className="mt-4 text-sm font-bold text-white px-5 py-2.5 rounded-full disabled:opacity-40"
            style={{ background: ORANGE }}
          >
            {registerPartner.isPending ? 'Submitting…' : 'Sign delivery contract'}
          </button>
          {registerPartner.isSuccess && <p className="mt-2 text-sm text-green-700">Contract received. Your delivery partner profile is pending review.</p>}
          {registerPartner.isError && <p className="mt-2 text-sm text-red-600">{registerPartner.error.message}</p>}
        </div>
      </section>
      <Footer />
    </div>
  )
}
