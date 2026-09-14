import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
type Draft = {
  id: number | null
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
}

type CampaignRecord = {
  id: number
  name: string
  subject: string
  preheader?: string
  headline: string
  intro?: string
  ctaText: string
  ctaUrl: string
  channel: Channel
  products: any[]
  status: string
  scheduledFor?: string | null
  sentAt?: string | null
  sentCount?: number
  failedCount?: number
  lastError?: string | null
}

const BRAND = '#047857'
const ORANGE = '#f97316'

const blankDraft = (): Draft => ({
  id: null,
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
})

function money(value: unknown) {
  return `UGX ${Number(value ?? 0).toLocaleString()}`
}

function ChannelPill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${active ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
      {active && <Check size={15} />}{children}
    </button>
  )
}

export default function AdminMarketingCampaigns() {
  const navigate = useNavigate()
  const [adminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [draft, setDraft] = useState<Draft>(() => blankDraft())
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [providerConfigured, setProviderConfigured] = useState(false)
  const [providerName, setProviderName] = useState<string | null>(null)
  const [fromAddress, setFromAddress] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const subscribersQuery = trpc.admin.marketingSubscribers.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const productsQuery = trpc.products.browse.useQuery({})

  const subscriberData = (subscribersQuery.data as any) ?? {}
  const subscribers = Array.isArray(subscriberData?.rows) ? subscriberData.rows : []
  const rawProducts = productsQuery.data as any
  const products = Array.isArray(rawProducts) ? rawProducts : Array.isArray(rawProducts?.products) ? rawProducts.products : []

  const emailSubscribers = useMemo(() => subscribers.filter((item: any) => item?.emailOptIn && item?.email && !item?.emailUnsubscribedAt), [subscribers])
  const whatsappSubscribers = useMemo(() => subscribers.filter((item: any) => item?.whatsappOptIn && item?.phone && !item?.whatsappUnsubscribedAt), [subscribers])
  const selectedProducts = useMemo(() => products.filter((product: any) => draft.selectedProductSlugs.includes(String(product?.slug))).slice(0, 6), [products, draft.selectedProductSlugs])
  const dealProducts = useMemo(() => [...products].filter((product: any) => Number(product?.stock ?? 1) > 0).sort((a: any, b: any) => Number(b?.discount ?? 0) - Number(a?.discount ?? 0)).slice(0, 18), [products])

  const audienceCount = draft.channel === 'email'
    ? emailSubscribers.length
    : draft.channel === 'whatsapp'
      ? whatsappSubscribers.length
      : new Set([...emailSubscribers.map((item: any) => `e:${item.email}`), ...whatsappSubscribers.map((item: any) => `w:${item.phone}`)]).size

  const loadServerState = async () => {
    if (!adminKey) return
    const encoded = encodeURIComponent(adminKey)
    const [statusResponse, campaignResponse] = await Promise.all([
      fetch(`/api/admin/marketing/status?key=${encoded}`),
      fetch(`/api/admin/marketing/campaigns?key=${encoded}`),
    ])
    const status = await statusResponse.json().catch(() => ({}))
    const list = await campaignResponse.json().catch(() => [])
    if (statusResponse.ok) {
      setProviderConfigured(Boolean(status.configured))
      setProviderName(status.provider ?? null)
      setFromAddress(status.from ?? null)
    }
    if (campaignResponse.ok && Array.isArray(list)) setCampaigns(list)
  }

  useEffect(() => {
    if (!adminKey) {
      navigate('/admin', { replace: true })
      return
    }
    loadServerState().catch(() => setNotice({ kind: 'error', text: 'Could not load the campaign service.' }))
  }, [adminKey, navigate])

  const patchDraft = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))

  const toggleProduct = (slug: string) => setDraft((current) => {
    const exists = current.selectedProductSlugs.includes(slug)
    const next = exists
      ? current.selectedProductSlugs.filter((item) => item !== slug)
      : current.selectedProductSlugs.length >= 6 ? current.selectedProductSlugs : [...current.selectedProductSlugs, slug]
    return { ...current, selectedProductSlugs: next }
  })

  const payload = () => ({
    id: draft.id,
    name: draft.name,
    subject: draft.subject,
    preheader: draft.preheader,
    headline: draft.headline,
    intro: draft.intro,
    ctaText: draft.ctaText,
    ctaUrl: draft.ctaUrl,
    channel: draft.channel,
    scheduledFor: draft.scheduledFor ? new Date(draft.scheduledFor).toISOString() : null,
    products: selectedProducts.map((product: any) => ({
      slug: String(product?.slug ?? ''),
      name: String(product?.name ?? ''),
      price: Number(product?.price ?? 0),
      oldPrice: product?.oldPrice == null ? null : Number(product.oldPrice),
      image: String(product?.image ?? '/images/product-default.png'),
      sellerName: String(product?.sellerName ?? 'UGSouq seller'),
      url: `${window.location.origin}/product/${encodeURIComponent(String(product?.slug ?? ''))}`,
    })),
  })

  const post = async (path: string, body: any) => {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || 'Request failed')
    return data
  }

  const save = async (status: 'draft' | 'scheduled') => {
    if (status === 'scheduled' && !draft.scheduledFor) return setNotice({ kind: 'error', text: 'Choose a schedule time first.' })
    if (status === 'scheduled' && draft.channel === 'whatsapp') return setNotice({ kind: 'error', text: 'WhatsApp delivery is not connected yet. Use Email or Both for now.' })
    setBusy(status)
    setNotice(null)
    try {
      const result = await post('/api/admin/marketing/campaigns/save', { key: adminKey, status, campaign: payload() })
      patchDraft({ id: Number(result.id) })
      await loadServerState()
      setNotice({ kind: 'ok', text: status === 'scheduled' ? 'Campaign scheduled on the server.' : 'Campaign draft saved on the server.' })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy('')
    }
  }

  const sendTest = async () => {
    if (!testEmail.trim()) return setNotice({ kind: 'error', text: 'Enter the email address that should receive the test.' })
    setBusy('test')
    setNotice(null)
    try {
      await post('/api/admin/marketing/campaigns/test', { key: adminKey, email: testEmail.trim(), campaign: payload() })
      setNotice({ kind: 'ok', text: `Test email sent to ${testEmail.trim()}.` })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy('')
    }
  }

  const sendNow = async () => {
    if (draft.channel === 'whatsapp') return setNotice({ kind: 'error', text: 'WhatsApp delivery is not connected yet.' })
    if (!window.confirm(`Send this campaign now to ${emailSubscribers.length} opted-in email subscriber(s)?`)) return
    setBusy('send')
    setNotice(null)
    try {
      const result = await post('/api/admin/marketing/campaigns/send', { key: adminKey, campaign: payload() })
      await loadServerState()
      setNotice({ kind: 'ok', text: `Campaign completed: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed.${result.capped ? ' The first 200 recipients were processed in this run.' : ''}` })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy('')
    }
  }

  const loadCampaign = (campaign: CampaignRecord, duplicate = false) => {
    const toLocalDateTime = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : ''
    setDraft({
      id: duplicate ? null : campaign.id,
      name: duplicate ? `${campaign.name} copy` : campaign.name,
      subject: campaign.subject,
      preheader: campaign.preheader || '',
      headline: campaign.headline,
      intro: campaign.intro || '',
      ctaText: campaign.ctaText,
      ctaUrl: campaign.ctaUrl,
      channel: campaign.channel,
      selectedProductSlugs: (campaign.products || []).map((product) => String(product?.slug ?? '')).filter(Boolean),
      scheduledFor: duplicate ? '' : toLocalDateTime(campaign.scheduledFor),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!adminKey) return null

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/admin')} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Back to admin"><ArrowLeft size={19} /></button>
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">UGSouq Admin</p><h1 className="text-lg font-black">Marketing Campaigns</h1></div>
          </div>
          <button onClick={() => navigate('/admin/operations')} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Operations</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300"><Megaphone size={15} /> Campaign studio</p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">Promotional campaigns, separate from order notifications.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Audience counts come from UGSouq consent records. Unsubscribed customers are excluded.</p>
            </div>
            <div className={`rounded-2xl border p-4 text-sm ${providerConfigured ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100' : 'border-amber-300/20 bg-amber-300/10 text-amber-100'}`}>
              <p className="font-black">Email delivery: {providerConfigured ? 'Connected' : 'Not configured'}</p>
              <p className="mt-1 leading-5">{providerConfigured ? `${providerName || 'provider'} · ${fromAddress || 'sender configured'}` : 'Add RESEND_API_KEY and MARKETING_FROM_EMAIL in Railway before using Test or Send now.'}</p>
            </div>
          </div>
        </section>

        {subscribersQuery.error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">Could not load marketing consent records. Check the admin key.</div>}
        {notice && <div className={`rounded-xl border p-3 text-sm font-bold ${notice.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4"><Mail className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{emailSubscribers.length}</p><p className="text-xs font-bold text-slate-500">Email opt-ins</p></div>
          <div className="rounded-2xl border bg-white p-4"><MessageCircle className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{whatsappSubscribers.length}</p><p className="text-xs font-bold text-slate-500">WhatsApp opt-ins</p></div>
          <div className="rounded-2xl border bg-white p-4"><Users className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{audienceCount}</p><p className="text-xs font-bold text-slate-500">Selected audience</p></div>
          <div className="rounded-2xl border bg-white p-4"><Package className="text-emerald-700" size={20} /><p className="mt-3 text-2xl font-black">{selectedProducts.length}/6</p><p className="text-xs font-bold text-slate-500">Products selected</p></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Campaign details</p><h2 className="mt-1 text-xl font-black">{draft.id ? `Edit campaign #${draft.id}` : 'Create campaign'}</h2></div>
              {draft.id && <button onClick={() => setDraft(blankDraft())} className="text-xs font-black text-emerald-700">New campaign</button>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Internal name<input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
              <label className="text-sm font-bold">Email subject<input value={draft.subject} onChange={(e) => patchDraft({ subject: e.target.value })} maxLength={90} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
              <label className="text-sm font-bold sm:col-span-2">Preheader<input value={draft.preheader} onChange={(e) => patchDraft({ preheader: e.target.value })} maxLength={140} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
              <label className="text-sm font-bold sm:col-span-2">Headline<input value={draft.headline} onChange={(e) => patchDraft({ headline: e.target.value })} maxLength={90} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
              <label className="text-sm font-bold sm:col-span-2">Intro<textarea value={draft.intro} onChange={(e) => patchDraft({ intro: e.target.value })} rows={3} maxLength={360} className="mt-1.5 w-full resize-none rounded-xl border px-3 py-2.5 text-sm" /></label>
              <label className="text-sm font-bold">CTA text<input value={draft.ctaText} onChange={(e) => patchDraft({ ctaText: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
              <label className="text-sm font-bold">CTA URL<input value={draft.ctaUrl} onChange={(e) => patchDraft({ ctaUrl: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            </div>

            <div>
              <p className="text-sm font-black">Audience channel</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ChannelPill active={draft.channel === 'email'} onClick={() => patchDraft({ channel: 'email' })}><Mail size={16} /> Email</ChannelPill>
                <ChannelPill active={draft.channel === 'whatsapp'} onClick={() => patchDraft({ channel: 'whatsapp' })}><MessageCircle size={16} /> WhatsApp</ChannelPill>
                <ChannelPill active={draft.channel === 'both'} onClick={() => patchDraft({ channel: 'both' })}>Both</ChannelPill>
              </div>
              {draft.channel !== 'email' && <p className="mt-2 text-xs font-semibold text-amber-700">WhatsApp campaign delivery is not connected yet. “Both” currently sends the email portion only.</p>}
            </div>

            <div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-black">Choose products</p><p className="text-xs text-slate-500">Up to six current marketplace products.</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{draft.selectedProductSlugs.length}/6</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {dealProducts.map((product: any) => {
                  const slug = String(product?.slug ?? '')
                  const selected = draft.selectedProductSlugs.includes(slug)
                  return (
                    <button key={slug || product?.id} type="button" onClick={() => slug && toggleProduct(slug)} className={`flex items-center gap-3 rounded-xl border p-2 text-left ${selected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                      <img src={product?.image || '/images/product-default.png'} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{product?.name}</span><span className="text-xs font-bold text-emerald-700">{money(product?.price)}</span><span className="block truncate text-[11px] text-slate-500">{product?.sellerName || 'UGSouq seller'}</span></span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-transparent'}`}><Check size={14} /></span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <label className="text-sm font-black">Schedule<input type="datetime-local" value={draft.scheduledFor} onChange={(e) => patchDraft({ scheduledFor: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm" /></label>
              <p className="mt-2 text-xs text-slate-500">Scheduled email campaigns are checked by the server approximately every five minutes.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-sm font-black">Test recipient<input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button onClick={() => save('draft')} disabled={!!busy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white text-sm font-black disabled:opacity-50"><Save size={16} /> {busy === 'draft' ? 'Saving…' : 'Save draft'}</button>
              <button onClick={() => save('scheduled')} disabled={!!busy || !draft.scheduledFor || draft.channel === 'whatsapp'} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-40"><CalendarClock size={16} /> {busy === 'scheduled' ? 'Scheduling…' : 'Schedule'}</button>
              <button onClick={sendTest} disabled={!!busy || !providerConfigured} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-800 disabled:opacity-40"><Mail size={16} /> {busy === 'test' ? 'Sending…' : 'Send test'}</button>
              <button onClick={sendNow} disabled={!!busy || !providerConfigured || draft.channel === 'whatsapp' || emailSubscribers.length === 0} className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black text-white disabled:opacity-40" style={{ backgroundColor: BRAND }}><Send size={16} /> {busy === 'send' ? 'Sending…' : 'Send now'}</button>
            </div>
          </div>

          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Mobile preview</p><h2 className="font-black">Customer email</h2></div><Smartphone size={20} className="text-emerald-700" /></div>
              <div className="mx-auto mt-4 max-w-[430px] overflow-hidden rounded-[28px] border-[8px] border-slate-950 bg-slate-950 shadow-xl">
                <div className="bg-slate-950 px-5 py-5 text-white">
                  <div className="flex items-center justify-between"><div className="text-xl font-black">UGSouq</div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">MARKETPLACE DEALS</span></div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Offers worth opening</p>
                  <h3 className="mt-2 text-3xl font-black leading-tight">{draft.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{draft.intro}</p>
                  <span className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: ORANGE }}>{draft.ctaText}</span>
                </div>
                <div className="bg-slate-100 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProducts.length ? selectedProducts.map((product: any) => <div key={product?.slug ?? product?.id} className="overflow-hidden rounded-xl bg-white"><img src={product?.image || '/images/product-default.png'} alt="" className="aspect-square w-full object-cover" /><div className="p-2"><p className="line-clamp-2 min-h-9 text-xs font-black">{product?.name}</p><p className="mt-1 text-xs font-black text-emerald-700">{money(product?.price)}</p></div></div>) : <div className="col-span-2 rounded-xl border border-dashed bg-white p-8 text-center text-xs font-semibold text-slate-500">Choose products to populate the email.</div>}
                  </div>
                </div>
                <div className="bg-white px-5 py-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-black text-emerald-800"><ShieldCheck size={15} /> Shop verified sellers with buyer protection</div>
                  <p className="mt-3 text-[10px] leading-4 text-slate-500">Promotional consent only. Order and security updates remain separate.</p>
                  <p className="mt-2 text-[10px] font-bold text-slate-500 underline">Unsubscribe from promotional email</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Server history</p><h2 className="text-xl font-black">Saved campaigns</h2></div><Clock3 size={20} className="text-slate-400" /></div>
          {campaigns.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No saved campaigns yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign) => <div key={campaign.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-black">{campaign.name}</p><p className="mt-1 text-xs text-slate-500">{campaign.channel} · {(campaign.products || []).length} products</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase">{campaign.status}</span></div>{campaign.scheduledFor && <p className="mt-2 text-xs font-semibold">Scheduled: {new Date(campaign.scheduledFor).toLocaleString()}</p>}{campaign.sentAt && <p className="mt-1 text-xs text-slate-500">Sent {campaign.sentCount || 0} · Failed {campaign.failedCount || 0}</p>}{campaign.lastError && <p className="mt-2 text-xs font-semibold text-rose-700">{campaign.lastError}</p>}<div className="mt-3 flex gap-3"><button onClick={() => loadCampaign(campaign)} className="text-xs font-black text-emerald-700">Open</button><button onClick={() => loadCampaign(campaign, true)} className="flex items-center gap-1 text-xs font-black text-slate-600"><Copy size={13} /> Duplicate</button></div></div>)}</div>}
        </section>
      </main>
    </div>
  )
}
