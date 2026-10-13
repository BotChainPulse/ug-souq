import { useState } from 'react'
import { serviceReviewProblem } from '../../lib/serviceReview'
import type { ServiceDecision } from '../../lib/serviceReview'
type Props = {
  providerName: string
  busy: boolean
  error?: string
  onOpen: () => void
  onDecision: (decision: ServiceDecision, notes: string, checksCompleted: boolean) => Promise<unknown>
}
const labels: Record<ServiceDecision,string> = { approved: 'Approve profile', rejected: 'Reject application', suspended: 'Suspend profile' }
export default function ProviderReviewControls({ providerName, busy, error, onOpen, onDecision }: Props) {
  const [decision, setDecision] = useState<ServiceDecision | null>(null)
  const [notes, setNotes] = useState('')
  const [checks, setChecks] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState('')
  const open = (value: ServiceDecision) => { onOpen(); setDecision(value); setProblem(null); setSaved(''); setChecks(false) }
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!decision || busy) return
    const issue = serviceReviewProblem(decision, notes, checks)
    setProblem(issue)
    if (issue) return
    try {
      await onDecision(decision, notes.trim(), checks)
      setSaved(`${labels[decision]} decision saved for ${providerName}.`)
      setDecision(null); setNotes(''); setChecks(false)
    } catch { /* The parent displays the server error for this provider. */ }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">{(['approved','rejected','suspended'] as const).map(value => <button key={value} type="button" disabled={busy} aria-expanded={decision === value} onClick={() => open(value)} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">{labels[value]}</button>)}</div>
    <p className="text-xs text-neutral-600">Choose a decision to open its review form. Approval still requires completed checks and review notes.</p>
    {decision && <form onSubmit={confirm} noValidate className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-label={`Review ${providerName}`}>
      <h5 className="font-black">{labels[decision]} · {providerName}</h5>
      <label className="block text-sm font-bold">Review notes<textarea autoFocus disabled={busy} required minLength={10} maxLength={1000} value={notes} onChange={e => { setNotes(e.target.value); setProblem(null) }} className="mt-1 block w-full rounded-lg border bg-white p-3 font-normal" placeholder="Describe the checks or decision reason. Do not enter identity-document numbers." /><span className="mt-1 block text-xs font-normal">{notes.trim().length}/10 minimum characters · up to 1,000</span></label>
      {decision === 'approved' && <label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={checks} onChange={e => { setChecks(e.target.checked); setProblem(null) }} /><span>I completed identity, contact, capability and any required licence checks for this provider. Approval is not a guarantee of workmanship.</span></label>}
      {(problem || error) && <p role="alert" className="text-sm font-semibold text-red-800">{problem || error}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Saving decision…' : decision === 'approved' ? 'Confirm approval' : decision === 'rejected' ? 'Confirm rejection' : 'Confirm suspension'}</button><button type="button" disabled={busy} onClick={() => { setDecision(null); setProblem(null) }} className="rounded-lg border bg-white px-4 py-2 text-sm">Cancel review</button></div>
    </form>}
    {saved && <p role="status" className="text-sm font-bold text-emerald-800">{saved}</p>}
  </div>
}
