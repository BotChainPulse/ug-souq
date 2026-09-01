import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { MailX } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '../providers/trpc'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const requestedChannel = params.get('channel')
  const channel = requestedChannel === 'whatsapp' || requestedChannel === 'email' ? requestedChannel : 'all'
  const [done, setDone] = useState(false)
  const unsubscribe = trpc.marketing.unsubscribe.useMutation({ onSuccess: (result) => setDone(result.ok) })

  const label = channel === 'all' ? 'all promotional messages' : `${channel} promotions`

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f6]">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <MailX className="mx-auto text-emerald-700" size={34} />
          <h1 className="mt-3 text-2xl font-extrabold">Marketing preferences</h1>
          {done ? (
            <><p className="mt-3 text-sm leading-6 text-neutral-600">You have been unsubscribed from {label}. Essential order and account updates are not affected.</p><Link to="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white">Return to UGSouq</Link></>
          ) : token.length !== 48 ? (
            <p className="mt-3 text-sm leading-6 text-neutral-600">This unsubscribe link is incomplete. Please use the link included in your UGSouq message.</p>
          ) : (
            <><p className="mt-3 text-sm leading-6 text-neutral-600">Stop receiving {label}? Essential messages about your orders will still be delivered.</p><button onClick={() => unsubscribe.mutate({ token, channel })} disabled={unsubscribe.isPending} className="mt-5 min-h-11 rounded-xl bg-neutral-900 px-5 text-sm font-bold text-white disabled:opacity-60">{unsubscribe.isPending ? 'Updating…' : `Unsubscribe from ${label}`}</button>{unsubscribe.isSuccess && !done && <p className="mt-3 text-sm text-red-700">This link is invalid or has expired.</p>}{unsubscribe.error && <p className="mt-3 text-sm text-red-700">We couldn’t update your preferences. Please try again.</p>}</>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
