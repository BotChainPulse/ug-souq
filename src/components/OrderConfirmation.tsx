import { useState } from 'react'
import { Link } from 'react-router'
import { CircleCheckBig, Copy, Check, Phone, MessageCircle, ArrowRight } from 'lucide-react'
import { fmt } from '../lib/cart'
import { ORANGE, MOMO_MERCHANT, AIRTEL_MERCHANT } from '../lib/site'
import { trpc } from '@/providers/trpc'

interface Props {
  placed: { code: string; total: number; phone: string; payment: 'mtn_momo' | 'airtel_money' | 'cash' }
}

export default function OrderConfirmation({ placed }: Props) {
  const [payRef, setPayRef] = useState('')
  const [paySent, setPaySent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedNum, setCopiedNum] = useState(false)
  const submitPayment = trpc.orders.submitPayment.useMutation()

  const isCash = placed.payment === 'cash'
  const m = placed.payment === 'mtn_momo' ? MOMO_MERCHANT : AIRTEL_MERCHANT
  const label = placed.payment === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'
  const ussd = placed.payment === 'mtn_momo' ? '*165#' : '*185#'

  const copyCode = () => {
    navigator.clipboard?.writeText(placed.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const copyNum = () => {
    navigator.clipboard?.writeText(m.number)
    setCopiedNum(true)
    setTimeout(() => setCopiedNum(false), 2000)
  }

  const submitPay = async () => {
    try {
      await submitPayment.mutateAsync({ code: placed.code, phone: placed.phone, ref: payRef.trim() })
      setPaySent(true)
    } catch { /* shown inline */ }
  }

  const steps = [
    { t: `Open ${label} on your phone`, d: `Dial ${ussd}` },
    { t: `Send ${fmt(placed.total)} to ${m.number}`, d: m.name },
    { t: 'Use order code as reference', d: placed.code, mono: true },
    { t: 'Paste the transaction ID below', d: 'From the confirmation SMS' },
  ]

  return (
    <div className="space-y-4">
      {/* Success hero */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-7 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 grid place-items-center ring-8 ring-green-50/50">
            <CircleCheckBig size={36} className="text-green-600" />
          </div>
          <h1 className="mt-5 text-xl font-extrabold tracking-tight">Order placed successfully</h1>
          <p className="mt-1.5 text-sm text-neutral-500">We'll confirm on WhatsApp/SMS shortly.</p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 pl-4 pr-1.5 py-1.5">
            <span className="text-xs font-medium text-neutral-400">Order</span>
            <span className="font-mono text-base font-extrabold tracking-wider" style={{ color: ORANGE }}>{placed.code}</span>
            <button onClick={copyCode} className="w-7 h-7 rounded-full grid place-items-center hover:bg-neutral-200/60 transition-colors" aria-label="Copy order code">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-neutral-500" />}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-neutral-500">
            <span>Total</span>
            <span className="text-lg font-extrabold text-neutral-900">{fmt(placed.total)}</span>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2.5">
          <Link to="/account" className="flex-1 px-5 py-3 rounded-full text-sm font-bold text-white inline-flex items-center justify-center gap-2" style={{ background: ORANGE }}>
            View my account & orders <ArrowRight size={16} />
          </Link>
          <Link to="/" className="flex-1 px-5 py-3 rounded-full text-sm font-bold border border-neutral-300 hover:border-neutral-400 text-center transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>

      {/* Payment section */}
      {!isCash && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-7">
          {paySent ? (
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-50 grid place-items-center">
                <CircleCheckBig size={30} className="text-green-600" />
              </div>
              <h2 className="mt-4 font-extrabold text-lg">Payment received for confirmation</h2>
              <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">We're verifying your {label} transaction ID. Once confirmed, your order moves to <b>Confirmed</b> and delivery starts. Track it in My Account.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: '#FFF3E6' }}>
                  <Phone size={20} style={{ color: ORANGE }} />
                </div>
                <div>
                  <h2 className="font-extrabold text-base leading-tight">Pay {fmt(placed.total)} with {label}</h2>
                  <p className="text-xs text-neutral-500">Follow the steps below</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500">Send to</p>
                  <p className="font-mono font-bold text-base tracking-wide">{m.number}</p>
                  <p className="text-xs text-neutral-500">{m.name}</p>
                </div>
                <button onClick={copyNum} className="w-9 h-9 rounded-full grid place-items-center border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors" aria-label="Copy number">
                  {copiedNum ? <Check size={15} className="text-green-600" /> : <Copy size={15} className="text-neutral-500" />}
                </button>
              </div>

              <ol className="mt-4 space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-xs font-bold text-white" style={{ background: ORANGE }}>{i + 1}</span>
                    <div className="pt-0.5">
                      <p className="text-sm font-semibold leading-tight">{s.t}</p>
                      <p className={`text-xs ${s.mono ? 'font-mono font-bold text-neutral-700' : 'text-neutral-500'}`}>{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Transaction ID (from the SMS)"
                className="mt-5 w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 font-mono transition-all"
              />
              <button
                disabled={payRef.trim().length < 6 || submitPayment.isPending}
                onClick={submitPay}
                className="mt-3 w-full text-sm font-bold text-white py-3.5 rounded-full disabled:opacity-40 transition-opacity"
                style={{ background: ORANGE }}>
                {submitPayment.isPending ? 'Submitting…' : "I've sent the money"}
              </button>
              {submitPayment.isError && <p className="mt-2 text-sm text-red-600 text-center">{submitPayment.error.message}</p>}
              <p className="mt-3 text-xs text-neutral-500 text-center flex items-center justify-center gap-1.5">
                <MessageCircle size={13} /> Prefer cash? Tell us on WhatsApp and we'll switch the order.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
