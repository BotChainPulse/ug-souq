export type ServiceDecision = 'approved' | 'rejected' | 'suspended'
export function serviceReviewProblem(decision: ServiceDecision, notes: string, checksCompleted: boolean) {
  if (notes.trim().length < 10) return 'Enter at least 10 characters describing the checks or reason for your decision.'
  if (notes.trim().length > 1000) return 'Keep review notes within 1,000 characters.'
  if (decision === 'approved' && !checksCompleted) return 'Complete the identity, contact, capability and required licence checks, then tick the confirmation before approving.'
  return null
}
