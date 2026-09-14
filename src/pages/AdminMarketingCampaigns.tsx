import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock3,
  Copy,
  Mail,
  Megaphone,
  MessageCircle,
  Package,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react'
import { trpc } from '../providers/trpc'

type Channel = 'email' | 'whatsapp' | 'both'
type CampaignStatus = 'draft' | 'queued'

type CampaignDraft = {
  id: string
  name: string
  subject: string
  preheader: string
  headline: string
  intro: string
  ctaText: string
  ctaUrl: string
  channel: Channel
  selectedProductSlugs: string[]
  scheduledFor: string
  status: CampaignStatus
  updatedAt: string
}

const STORAGE_KEY = 'ugsouq_marketing_campaigns_v1'
const BRAND = '#047857'
const ORANGE = '#f97316'

const defaultDraft = (): CampaignDraft => ({
  id: `campaign-${Date.now()}`,
  name: 'Weekend top deals',
  subject: 'UGSouq deals worth opening',
  preheader: 'Fresh marketplace offers from sellers on UGSouq.',
  headline: 'Top deals picked for you',
  intro: 'Shop selected marketplace offers while stock lasts. Prices and availability can change at any time.',
  ctaText: 'Shop UGSouq',
  ctaUrl: 'https://www.ugsouq.com/catalog?deals=true',
  channel: 'email',
  selectedProductSlugs: [],
  scheduledFor: '',
  status: 'draft',
  updatedAt: new Date().toISOString(),
})

function readStoredCampaigns(): CampaignDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function money(value: unknown) {
  return `UGX ${Number(value ?? 0).toLocaleString()}`
}

function ChannelPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${active ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}
    >
      {active && <Check size={15} />}
      {children}
    </button>
  )
}

export default function AdminMarketingCampaigns() {
  const navigate = useNavigate()
  const [adminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [draft, setDraft] = useState<CampaignDraft>(() => defaultDraft())
  const [saved, setSaved] = useState<CampaignDraft[]>(() => readStoredCampaigns())
  const [savedNotice, setSavedNotice] = useState('')

  const subscribersQuery = trpc.admin.marketingSubscribers.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false },
  )
  const productsQuery = trpc.products.browse.useQuery({})

  const subscribers = (subscribersQuery.data ?? []) as any[]
  const products = (productsQuery.data ?? []) as any[]

  const emailSubscribers = useMemo(
    () => subscribers.filter((subscriber) => Boolean(subscriber?.emailOptIn && subscriber?.email)),
    [subscribers],
  )
  const whatsappSubscribers = useMemo(
    () => subscribers.filter((subscriber) => Boolean(subscriber?.whatsappOptIn && subscriber?.phone)),
    [subscribers],
  )
  const selectedProducts = useMemo(
    () => products.filter((product) => draft.selectedProductSlugs.includes(String(product?.slug))).slice(0, 6),
    [products, draft.selectedProductSlugs],
  )
  const dealProducts = useMemo(
    () => [...products]
      .filter((product) => Number(product?.stock ?? 1) > 0)
      .sort((a, b) => Number(b?.discount ?? 0) - Number(a?.discount ?? 0))
      .slice(0, 18),
    [products],
  )

  useEffect(() => {
    if (!adminKey) navigate('/admin', { replace: true })
  }, [adminKey, navigate])

  const patchDraft = (patch: Partial<CampaignDraft>) => {
    setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
  }

  const toggleProduct = (slug: string) => {
    setDraft((current) => {
      const exists = current.selectedProductSlugs.includes(slug)
      const next = exists
        ? current.selectedProductSlugs.filter((item) => item !== slug)
        : current.selectedProductSlugs.length >= 6
          ? current.selectedProductSlugs
          : [...current.selectedProductSlugs, slug]
      return { ...current, selectedProductSlugs: next, updatedAt: new Date().toISOString() }
    })
  }

  const persist = (status: CampaignStatus) => {
    const nextDraft = { ...draft, status, updatedAt: new Date().toISOString() }
    const nextSaved = [nextDraft, ...saved.filter((item) => item.id !== nextDraft.id)].slice(0, 30)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved))
    setSaved(nextSaved)
    setDraft(nextDraft)
    setSavedNotice(status === 'queued' ? 'Campaign schedule queued on this admin device.' : 'Draft saved on this admin device.')
    window.setTimeout(() => setSavedNotice(''), 3500)
  }

  const duplicateCampaign = (campaign: CampaignDraft) => {
    setDraft({ ...campaign, id: `campaign-${Date.now()}`, name: `${campaign.name} copy`, status: 'draft', updatedAt: new Date().toISOString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const audienceCount = draft.channel === 'email'
    ? emailSubscribers.length
    : draft.channel === 'whatsapp'
      ? whatsappSubscribers.length
      : new Set([
          ...emailSubscribers.map((item) => `e:${item.email}`),
          ...whatsappSubscribers.map((item) => `w:${item.phone}`),
        ]).size

  if (!adminKey) return null

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/admin/operations')} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Back to admin operations"><ArrowLeft size={19} /></button>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">UGSouq Admin</p>
              <h1 className="truncate text-lg font-black">Marketing Campaigns</h1>
            </div>
          </div>
          <button onClick={() => navigate('/admin')} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Dashboard</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300"><Megaphone size={15} /> Campaign studio</p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">Build UGSouq offers without mixing them with order alerts.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Only customers who explicitly selected marketing Email or WhatsApp are counted here. Order, payment and security messages remain separate.</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              <p className="font-black">Delivery connection</p>
              <p className="mt-1 leading-5">Campaign creation and preview are ready. Test/send stays locked until a production email provider is connected; WhatsApp follows after that.</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><Mail className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{emailSubscribers.length}</p><p className="text-xs font-bold text-slate-500">Email opt-ins</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><MessageCircle className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{whatsappSubscribers.length}</p><p className="text-xs font-bold text-slate-500">WhatsApp opt-ins</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><Users className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{audienceCount}</p><p className="text-xs font-bold text-slate-500">Current audience</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><Package className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{selectedProducts.length}/6</p><p className="text-xs font-bold text-slate-500">Products selected</p></div>
        </section>

        {subscribersQuery.error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">Marketing subscribers could not be loaded. Check the administrator key and backend connection.</div>}
        {savedNotice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{savedNotice}</div>}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Campaign details</p>
              <h2 className="mt-1 text-xl font-black">Create campaign</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">Internal campaign name<input value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <label className="text-sm font-bold text-slate-700">Email subject<input value={draft.subject} onChange={(event) => patchDraft({ subject: event.target.value })} maxLength={90} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Preheader<input value={draft.preheader} onChange={(event) => patchDraft({ preheader: event.target.value })} maxLength={140} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Headline<input value={draft.headline} onChange={(event) => patchDraft({ headline: event.target.value })} maxLength={90} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Intro<textarea value={draft.intro} onChange={(event) => patchDraft({ intro: event.target.value })} rows={3} maxLength={360} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <label className="text-sm font-bold text-slate-700">CTA text<input value={draft.ctaText} onChange={(event) => patchDraft({ ctaText: event.target.value })} maxLength={40} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <label className="text-sm font-bold text-slate-700">CTA URL<input value={draft.ctaUrl} onChange={(event) => patchDraft({ ctaUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
            </div>

            <div>
              <p className="text-sm font-black text-slate-700">Audience channel</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ChannelPill active={draft.channel === 'email'} onClick={() => patchDraft({ channel: 'email' })}><Mail size={16} /> Email</ChannelPill>
                <ChannelPill active={draft.channel === 'whatsapp'} onClick={() => patchDraft({ channel: 'whatsapp' })}><MessageCircle size={16} /> WhatsApp</ChannelPill>
                <ChannelPill active={draft.channel === 'both'} onClick={() => patchDraft({ channel: 'both' })}>Both</ChannelPill>
              </div>
              <p className="mt-2 text-xs text-slate-500">Current eligible audience: <b>{audienceCount}</b>. Unsubscribed contacts are excluded by the opt-in records.</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-700">Choose products</p><p className="text-xs text-slate-500">Up to six current marketplace items.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{draft.selectedProductSlugs.length}/6</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {dealProducts.map((product) => {
                  const slug = String(product?.slug ?? '')
                  const selected = draft.selectedProductSlugs.includes(slug)
                  return (
                    <button key={slug || product?.id} type="button" onClick={() => slug && toggleProduct(slug)} className={`flex items-center gap-3 rounded-xl border p-2 text-left ${selected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                      <img src={product?.image || '/images/product-default.png'} alt="" className="h-14 w-14 rounded-lg bg-slate-100 object-cover" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{product?.name}</span><span className="block text-xs font-bold text-emerald-700">{money(product?.price)}</span><span className="block truncate text-[11px] text-slate-500">{product?.sellerName || 'UGSouq seller'}</span></span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-transparent'}`}><Check size={14} /></span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-sm font-black text-slate-700">Schedule date and time<input type="datetime-local" value={draft.scheduledFor} onChange={(event) => patchDraft({ scheduledFor: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <p className="mt-2 text-xs leading-5 text-slate-500">The schedule can be prepared now. Automatic server delivery will be activated when the email provider is connected.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button onClick={() => persist('draft')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black"><Save size={16} /> Save draft</button>
              <button onClick={() => persist('queued')} disabled={!draft.scheduledFor} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><CalendarClock size={16} /> Queue schedule</button>
              <button disabled className="flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-black text-amber-800 opacity-70" title="Connect an email delivery provider first"><Mail size={16} /> Send test</button>
              <button disabled className="flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl px-3 text-sm font-black text-white opacity-50" style={{ backgroundColor: BRAND }} title="Connect an email delivery provider first"><Send size={16} /> Send now</button>
            </div>
          </div>

          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Mobile preview</p><h2 className="mt-1 font-black">Customer email</h2></div><Smartphone size={20} className="text-emerald-700" /></div>
              <div className="mx-auto mt-4 max-w-[430px] overflow-hidden rounded-[28px] border-[8px] border-slate-950 bg-slate-950 shadow-xl">
                <div className="bg-slate-950 px-5 py-5 text-white">
                  <div className="flex items-center justify-between gap-3"><div className="text-xl font-black">UGSouq</div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">MARKETPLACE DEALS</span></div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Offers worth opening</p>
                  <h3 className="mt-2 text-3xl font-black leading-tight">{draft.headline || 'UGSouq deals'}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{draft.intro || 'Selected marketplace offers from UGSouq.'}</p>
                  <a href={draft.ctaUrl || '#'} className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: ORANGE }}>{draft.ctaText || 'Shop now'}</a>
                </div>
                <div className="bg-slate-100 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProducts.length > 0 ? selectedProducts.map((product) => <div key={product?.slug ?? product?.id} className="overflow-hidden rounded-xl bg-white shadow-sm"><img src={product?.image || '/images/product-default.png'} alt="" className="aspect-square w-full object-cover" /><div className="p-2"><p className="line-clamp-2 min-h-9 text-xs font-black leading-4">{product?.name}</p><p className="mt-1 text-xs font-black text-emerald-700">{money(product?.price)}</p>{Number(product?.oldPrice ?? 0) > Number(product?.price ?? 0) && <p className="text-[10px] text-slate-400 line-through">{money(product?.oldPrice)}</p>}</div></div>) : <div className="col-span-2 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-semibold text-slate-500">Choose products to populate this campaign.</div>}
                  </div>
                </div>
                <div className="bg-white px-5 py-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-black text-emerald-800"><ShieldCheck size={15} /> Shop verified sellers with buyer protection</div>
                  <p className="mt-3 text-[10px] leading-4 text-slate-500">You are receiving this promotion because you opted in to UGSouq deals. Order, payment and security updates are separate.</p>
                  <p className="mt-2 text-[10px] font-bold text-slate-500 underline">Manage preferences · Unsubscribe</p>
                  <p className="mt-4 text-[9px] leading-4 text-slate-400">UGSouq will never ask for your password, PIN, OTP or full payment details by email or WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Saved work</p><h2 className="mt-1 text-xl font-black">Campaign drafts</h2></div><Clock3 size={20} className="text-slate-400" /></div>
          {saved.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No campaign drafts yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{saved.map((campaign) => <div key={campaign.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-black">{campaign.name}</p><p className="mt-1 text-xs text-slate-500">{campaign.channel} · {campaign.selectedProductSlugs.length} products</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${campaign.status === 'queued' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{campaign.status}</span></div>{campaign.scheduledFor && <p className="mt-2 text-xs font-semibold text-slate-600">Scheduled: {new Date(campaign.scheduledFor).toLocaleString()}</p>}<button onClick={() => duplicateCampaign(campaign)} className="mt-3 flex items-center gap-1 text-xs font-black text-emerald-700"><Copy size={13} /> Duplicate & edit</button></div>)}</div>}
        </section>
      </main>
    </div>
  )
}
