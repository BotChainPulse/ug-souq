import { useState } from 'react'
import { RotateCcw, ShieldCheck, MessageCircle, PackageX } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE, WA_LINK } from '../lib/site'
import { trpc } from '../providers/trpc'

export default function Returns() {
  const [form, setForm] = useState({ code: '', phone: '', reason: 'Item not as described', details: '' })
  const requestReturn = trpc.buyerOrders.requestReturn.useMutation()

  const submitReturn = () => {
    requestReturn.mutate({
      code: form.code.trim().toUpperCase(),
      phone: form.phone.trim(),
      reason: form.reason,
      details: form.details.trim() || undefined,
    })
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold flex items-center gap-3"><RotateCcw size={26} style={{ color: ORANGE }} /> Returns & refunds</h1>
        <p className="mt-3 text-neutral-600">Every order on UG Souq is covered by Buyer Protection. If something isn't right, we make it right.</p>

        <div className="mt-8 space-y-4">
          {[
            { icon: ShieldCheck, t: '7-day return window', d: 'Changed your mind or item not as described? Return it within 7 days of delivery for a full refund to your MoMo/Airtel Money.' },
            { icon: PackageX, t: 'Damaged or wrong item', d: 'Report within 48 hours with a photo on WhatsApp. We arrange pickup and refund or replace — your choice.' },
            { icon: RotateCcw, t: 'Food orders', d: 'Food can\'t be returned, but if your order arrives wrong, cold or incomplete, message us within 2 hours for a credit or refund.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-5 flex gap-4">
              <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
              <div>
                <h3 className="font-bold text-sm">{t}</h3>
                <p className="text-sm text-neutral-600 mt-1">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="font-extrabold">Request a return</h2>
          <p className="mt-1 text-sm text-neutral-600">Use the order code and phone number from the delivered order. This sends the request directly to the administrator queue.</p>
          {requestReturn.isSuccess ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{requestReturn.data.alreadyOpen ? 'A return request is already open for this order.' : `Return request #${requestReturn.data.requestId} was submitted for review.`}</div> : <div className="mt-4 grid gap-3">
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Order code, e.g. US-ABCDE" className="min-h-11 rounded-xl border border-neutral-300 px-3 text-sm uppercase" />
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number used for the order" className="min-h-11 rounded-xl border border-neutral-300 px-3 text-sm" />
            <select value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-sm"><option>Item not as described</option><option>Wrong item delivered</option><option>Item arrived damaged</option><option>Missing parts or accessories</option><option>Other</option></select>
            <textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="Describe the problem" rows={3} className="rounded-xl border border-neutral-300 p-3 text-sm" />
            {requestReturn.error && <p className="text-sm font-semibold text-red-700">{requestReturn.error.message}</p>}
            <button onClick={submitReturn} disabled={requestReturn.isPending || form.code.trim().length < 4 || form.phone.trim().length < 9} className="min-h-11 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white disabled:opacity-40">{requestReturn.isPending ? 'Submitting…' : 'Submit return request'}</button>
          </div>}
        </section>

        <a href={WA_LINK} target="_blank" rel="noreferrer" className="mt-8 flex items-center justify-center gap-2 text-sm font-bold text-white py-3.5 rounded-full" style={{ background: '#16a34a' }}>
          <MessageCircle size={16} /> Need help? Contact WhatsApp support
        </a>
      </div>
      <Footer />
    </div>
  )
}
