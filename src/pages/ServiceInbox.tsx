import { useState } from 'react'
import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { getAccount } from '../lib/account'
import { serviceContactLinks } from '../lib/serviceContact'
import { trpc } from '../providers/trpc'

export default function ServiceInbox() {
  const [account] = useState(getAccount)
  const [saved, setSaved] = useState('')
  const inbox = trpc.services.inbox.useQuery({ phone: account?.phone ?? '' }, { enabled: !!account?.deletionToken, retry: false, refetchInterval: 30_000 })
  const respond = trpc.services.respond.useMutation({ onSuccess: () => { setSaved('Enquiry status saved.'); inbox.refetch() } })
  const data = inbox.data
  return <div className="min-h-screen bg-neutral-50"><Header /><main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
    <Link to="/services" className="font-bold text-emerald-800 underline">Services catalogue</Link><h1 className="text-3xl font-black">Provider inbox</h1>
    <p>Review customer enquiries here, then agree the scope, price and timing directly. An enquiry is not a confirmed booking or payment.</p>
    {!account?.deletionToken ? <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Open your protected account</h2><p className="mt-2">Use the device on which you registered. A phone number alone cannot open a provider inbox.</p><Link to="/account" className="mt-3 inline-block font-bold text-emerald-800 underline">Open account</Link></section>
      : inbox.isLoading ? <p role="status">Loading your inbox…</p>
      : inbox.error ? <p role="alert" className="text-red-800">{inbox.error.message} <button type="button" onClick={() => inbox.refetch()} className="underline">Retry</button> · <Link to="/support" className="underline">Account recovery help</Link></p>
      : !data ? <section className="rounded-xl border bg-white p-5">You have no provider application yet. <Link to="/services/register" className="font-bold underline">Apply as a provider</Link>.</section>
      : <>
        <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">{data.provider.businessName}</h2><p className="mt-2">Profile status: <b>{data.provider.status}</b></p><p className="mt-2 text-sm">{data.emailConfigured ? 'Email alerts link here when your profile review changes or a new enquiry arrives. Check your registered email and spam folder.' : 'Email alerts are unavailable. Check this inbox for updates.'} This page refreshes every 30 seconds while open.</p><button type="button" onClick={() => inbox.refetch()} disabled={inbox.isFetching} className="mt-3 rounded-lg border px-4 py-2 font-bold disabled:opacity-50">{inbox.isFetching ? 'Refreshing…' : 'Refresh inbox'}</button></section>
        {data.provider.status !== 'approved' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4">Customer enquiries are available only while your provider profile is approved. <Link to="/support" className="underline">Contact support</Link> about your review.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Customer enquiries</h2><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold">{data.requests.filter(r => r.status === 'requested').length} awaiting contact</span></div>
        {data.provider.status === 'approved' && !data.requests.length && <p className="rounded-xl border bg-white p-5">No customer enquiries yet.</p>}
        {respond.error && <p role="alert" className="text-red-800">{respond.error.message}</p>}{saved && <p role="status" className="font-bold text-emerald-800">{saved}</p>}
        {data.requests.map(r => { const links = r.contact ? serviceContactLinks(r.contact.phone) : null; return <article key={r.id} className="space-y-3 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-black">{r.reference} · {r.status}</h3><span className="text-xs">{new Date(r.createdAt).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}</span></div><p>{r.district} · Preferred date: {r.preferredDate || 'Agree with customer'}</p><p className="whitespace-pre-wrap">{r.brief}</p>
          {r.contact && <section className="rounded-lg bg-emerald-50 p-3"><h4 className="font-bold">{r.contact.name}</h4><p>{r.contact.phone}</p><div className="mt-3 flex flex-wrap gap-3">{links ? <><a href={links.call} className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white">Call customer</a><a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-800 px-4 py-2 font-bold text-emerald-900">Open WhatsApp</a></> : <p className="text-sm">Use the number above or contact support to confirm the contact format.</p>}</div><p className="mt-3 text-xs">The customer selected your profile and agreed to contact for this enquiry only. Use these details only to coordinate this work. WhatsApp requires a WhatsApp account; opening it does not send a message.</p></section>}
          {r.contact && <div className="flex flex-wrap gap-2">{(['contacted','cancelled','closed'] as const).map(status => <button key={status} type="button" disabled={respond.isPending} onClick={() => { setSaved(''); respond.mutate({ phone: account!.phone, id: r.id, status }) }} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">{respond.isPending && respond.variables?.id === r.id ? 'Saving…' : status === 'contacted' ? 'Mark contacted' : status === 'cancelled' ? 'Unable to help' : 'Close enquiry'}</button>)}</div>}
          <p className="text-xs text-neutral-600">Status changes record coordination only. Closing does not certify completed work, payment or commission.</p></article> })}
        {!!data.notifications.length && <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Recent alerts</h2><ul className="mt-3 space-y-2">{data.notifications.map(n => <li key={n.id} className="text-sm">{n.kind === 'enquiry' ? `Enquiry SR-${n.requestId}` : `Profile ${n.decision}`} · Email: {n.emailState === 'accepted' ? 'accepted by email provider; delivery not confirmed here' : n.emailState === 'skipped' ? 'not sent; check the inbox' : n.emailState === 'failed' ? 'send failed; administrator can review' : 'queued for sending'}</li>)}</ul></section>}
      </>}
  </main><Footer /></div>
}
