import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send } from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'

type Msg = { from: 'bot' | 'user'; text: string; links?: { label: string; to: string }[] }

const buyerOpts = [
  'Track my order', 'Shop Flash Sale', 'Order food (KFC, chicken & more)',
  'Payment options', 'Returns & refunds', 'Talk to a human (WhatsApp)',
]
const sellerOpts = [
  'Open a shop', 'How verification works', 'Required documents (ID, TIN…)',
  'Payouts (MoMo/Airtel)', 'Affiliate program', 'Talk to a human (WhatsApp)',
]

function answer(q: string): Msg {
  const t = q.toLowerCase()
  if (t.includes('track')) return { from: 'bot', text: 'You can track any order with your order code (e.g. US-XXXXX) and the phone number you ordered with.', links: [{ label: 'Track my order', to: '/track' }] }
  if (t.includes('flash')) return { from: 'bot', text: 'The Flash Sale has verified sellers first, with discounts up to 35%. Deals refresh daily!', links: [{ label: 'Shop Flash Sale', to: '/' }] }
  if (t.includes('food') || t.includes('kfc') || t.includes('chicken')) return { from: 'bot', text: 'UG Souq Food delivers from KFC Kampala, Chicken Tonight, Chips & Chicken Express, Cafe Javas, local kitchens and more — in under 45 minutes.', links: [{ label: 'Order food', to: '/food' }] }
  if (t.includes('payment')) return { from: 'bot', text: 'We accept MTN MoMo, Airtel Money, and cash on delivery. No card needed. Your MoMo PIN is never seen or stored by us.' }
  if (t.includes('return') || t.includes('refund')) return { from: 'bot', text: 'Every order has Buyer Protection: 7-day returns on products, and food issues reported within 2 hours get a refund or credit.', links: [{ label: 'Returns & refunds', to: '/returns' }] }
  if (t.includes('open a shop') || t.includes('sell')) return { from: 'bot', text: 'Opening a shop is free. You\'ll need your National ID, business location, and a MoMo/Airtel number for payouts. TIN is only needed for companies.', links: [{ label: 'Open a shop', to: '/sell' }] }
  if (t.includes('verification')) return { from: 'bot', text: 'Verification means we check your National ID, confirm your business location, and (for companies) your URA TIN. Verified sellers get the blue badge and rank first. It takes 1–2 business days.', links: [{ label: 'How verification works', to: '/verification' }] }
  if (t.includes('document')) return { from: 'bot', text: 'You\'ll need: 1) National ID or passport photo, 2) your business district + landmark, 3) a MoMo/Airtel payout number, and 4) a TIN only if registering as a company.', links: [{ label: 'Start registration', to: '/sell' }] }
  if (t.includes('payout')) return { from: 'bot', text: 'Sellers are paid weekly (every Friday) directly to their MTN MoMo or Airtel Money number.' }
  if (t.includes('affiliate')) return { from: 'bot', text: 'Affiliates earn up to 8% commission on every sale through their link or coupon — free to join, paid monthly by MoMo.', links: [{ label: 'Join affiliates', to: '/affiliates' }] }
  if (t.includes('human') || t.includes('whatsapp')) return { from: 'bot', text: 'Sure — tap the button below to chat with our team on WhatsApp.', links: [{ label: 'Open WhatsApp chat', to: WA_LINK }] }
  if (t.includes('privacy') || t.includes('data')) return { from: 'bot', text: 'We follow Uganda\'s Data Protection and Privacy Act, 2019. You can request access, correction or deletion of your data any time.', links: [{ label: 'Privacy & data protection', to: '/privacy' }] }
  return { from: 'bot', text: 'I can help with orders, food delivery, payments, selling, verification and affiliates. Pick an option above, or tap "Talk to a human" to reach our team on WhatsApp.' }
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open])

  const greet = (r: 'buyer' | 'seller') => {
    setRole(r)
    setMsgs([{
      from: 'bot',
      text: r === 'buyer'
        ? 'Muli otya! 👋 I\'m Kik, your UG Souq shopping assistant. What would you like to do?'
        : 'Welcome, seller! 💼 I can guide you through opening a shop, verification, payouts and more.',
    }])
  }

  const ask = (q: string) => {
    setMsgs((m) => [...m, { from: 'user', text: q }])
    setTimeout(() => setMsgs((m) => [...m, answer(q)]), 400)
  }

  const submit = () => {
    if (!input.trim()) return
    ask(input.trim())
    setInput('')
  }

  const options = role === 'buyer' ? buyerOpts : role === 'seller' ? sellerOpts : []

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open chat"
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full text-white grid place-items-center shadow-xl hover:scale-105 transition-transform"
          style={{ background: ORANGE }}>
          <MessageCircle size={24} />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,360px)] h-[min(70vh,520px)] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: ORANGE }}>
            <div>
              <p className="font-extrabold text-sm">Kik — UG Souq Assistant</p>
              <p className="text-[11px] opacity-90">Typically replies instantly</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="p-1 hover:bg-white/20 rounded-full"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#faf9f7]">
            {!role ? (
              <div className="space-y-3 pt-2">
                <div className="bg-white rounded-2xl rounded-tl-sm border border-neutral-200 p-3 text-sm shadow-sm">
                  Muli otya! 👋 I'm <b>Kik</b>, the UG Souq assistant. How can I help you today — are you here to…
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => greet('buyer')} className="rounded-xl border-2 border-orange-500 bg-orange-50 py-3 text-sm font-bold hover:bg-orange-100">🛍️ Shop / Buy</button>
                  <button onClick={() => greet('seller')} className="rounded-xl border-2 border-neutral-800 py-3 text-sm font-bold hover:bg-neutral-100">🏪 Sell / Earn</button>
                </div>
              </div>
            ) : (
              <>
                {msgs.map((m, i) => (
                  <div key={i} className={m.from === 'user' ? 'flex justify-end' : ''}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${m.from === 'user' ? 'rounded-br-sm text-white' : 'rounded-tl-sm bg-white border border-neutral-200'}`}
                      style={m.from === 'user' ? { background: ORANGE } : {}}>
                      {m.text}
                      {m.links && (
                        <div className="mt-2 space-y-1.5">
                          {m.links.map((l) => l.to.startsWith('http') ? (
                            <a key={l.label} href={l.to} target="_blank" rel="noreferrer" className="block text-center text-xs font-bold text-white bg-green-600 rounded-full py-2 hover:bg-green-700">{l.label}</a>
                          ) : (
                            <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="block text-center text-xs font-bold text-white rounded-full py-2 hover:opacity-90" style={{ background: ORANGE }}>{l.label}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {options.map((o) => (
                    <button key={o} onClick={() => ask(o)} className="text-xs font-semibold border border-neutral-300 bg-white rounded-full px-3 py-1.5 hover:border-orange-400 hover:text-orange-700 transition-colors">{o}</button>
                  ))}
                </div>
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {role && (
            <div className="p-2.5 border-t border-neutral-200 bg-white flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Type a message…" className="flex-1 text-sm border border-neutral-300 rounded-full px-3.5 py-2 outline-none focus:border-neutral-500" />
              <button onClick={submit} aria-label="Send" className="w-9 h-9 rounded-full grid place-items-center text-white" style={{ background: ORANGE }}><Send size={16} /></button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
