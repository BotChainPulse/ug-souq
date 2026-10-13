import { useState } from 'react'
import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ServiceProfileForm from '../components/ServiceProfileForm'
import { getAccount } from '../lib/account'
import { trpc } from '../providers/trpc'
export default function ServiceProfile() {
  const [account] = useState(getAccount)
  const profile = trpc.services.editableProfile.useQuery({ phone: account?.phone ?? '' }, { enabled: !!account?.deletionToken, retry: false, refetchOnWindowFocus: false })
  const update = trpc.services.updateProfile.useMutation({ onSuccess: () => profile.refetch() })
  return <div className="min-h-screen bg-neutral-50"><Header /><main className="mx-auto max-w-2xl space-y-5 px-4 py-8"><Link to="/services/inbox" className="font-bold text-emerald-800 underline">Back to provider inbox</Link><h1 className="text-3xl font-black">Edit service profile</h1>
    {!account?.deletionToken ? <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Open your protected account</h2><p className="mt-2">Use the device on which you registered. Your phone number alone cannot edit a provider profile.</p><Link to="/account" className="mt-3 inline-block font-bold underline">Open account</Link></section>
      : profile.isLoading ? <p role="status">Loading your profile…</p>
      : profile.error ? <p role="alert">{profile.error.message} <button type="button" onClick={() => profile.refetch()} className="underline">Refresh profile</button> · <Link to="/support" className="underline">Get account help</Link></p>
      : update.data ? <section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-bold">{update.data.changed ? 'Changes submitted for review' : 'No profile changes to save'}</h2><p className="mt-2">{update.data.changed ? 'Your updated profile is Pending review. The administrator will review the changes before publishing it again. Existing enquiries have been retained.' : `Your profile remains ${update.data.status}.`}</p><Link to="/services/inbox" className="mt-3 inline-block font-bold underline">Open provider inbox</Link></section>
      : !profile.data ? <p>No provider profile found. <Link to="/services/register" className="underline">Apply as a provider</Link>.</p>
      : !['approved','pending'].includes(profile.data.status) ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-5">Your profile is {profile.data.status}. <Link to="/support" className="font-bold underline">Contact support</Link> before making changes.</p>
      : <><ServiceProfileForm key={profile.data.revision} profile={profile.data} saving={update.isPending} error={update.error?.message} onSave={value => { if (account) update.mutate({ ...value, phone: account.phone }) }} />{update.error?.data?.code === 'CONFLICT' && <button type="button" onClick={() => { update.reset(); profile.refetch() }} className="font-bold underline">Refresh profile and review the latest details</button>}</>}
  </main><Footer /></div>
}
