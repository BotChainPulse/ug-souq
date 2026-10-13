import { trpc } from '../../providers/trpc'
import { notificationFeedback, notificationPollInterval } from '../../lib/notificationFeedback'
type Props = { adminKey: string; providerId: number; requestId?: number; onQueued: () => void }
export default function NotifyProviderButton({ adminKey, providerId, requestId, onQueued }: Props) {
  const notify = trpc.admin.services.notifyProvider.useMutation({ onSuccess: onQueued })
  const status = trpc.admin.services.notificationStatus.useQuery({ key: adminKey, id: notify.data?.notificationId ?? 0 }, {
    enabled: !!adminKey && !!notify.data?.notificationId,
    retry: false,
    refetchInterval: query => notificationPollInterval(query.state.data),
  })
  return <div className="space-y-2">
    <button type="button" disabled={notify.isPending} aria-busy={notify.isPending} onClick={() => notify.mutate({ key: adminKey, providerId, requestId })} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40">{notify.isPending ? 'Queuing alert…' : requestId ? 'Notify provider of enquiry' : 'Notify provider of current review'}</button>
    {notify.isPending && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm">Saving this notification. Please wait…</p>}
    {notify.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Could not queue the alert: {notify.error.message} <button type="button" onClick={() => notify.mutate({ key: adminKey, providerId, requestId })} className="font-bold underline">Try again</button></p>}
    {notify.data && !notify.isPending && !notify.error && <div role="status" aria-live="polite" className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="font-bold">{notify.data.queued ? 'Notification saved.' : 'This event already has a saved notification; no duplicate created.'}</p><p>{status.data ? notificationFeedback(status.data) : 'Checking the email queue status…'}</p>{status.error && <p role="alert">Could not load the sending status: {status.error.message} <button type="button" onClick={() => status.refetch()} className="font-bold underline">Check again</button></p>}</div>}
  </div>
}
