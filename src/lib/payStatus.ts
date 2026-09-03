export function paymentLabel(o: { paymentMethod: string; paymentStatus: string }) {
  if (o.paymentStatus === 'paid') return { text: 'Paid', cls: 'bg-green-50 text-green-700' }
  if (o.paymentStatus === 'pending') return { text: 'Payment pending', cls: 'bg-amber-50 text-amber-700' }
  if (o.paymentStatus === 'pending_confirmation') return { text: 'Confirming payment', cls: 'bg-amber-50 text-amber-700' }
  if (o.paymentStatus === 'failed') return { text: 'Payment failed', cls: 'bg-red-50 text-red-700' }
  if (o.paymentStatus === 'refunded') return { text: 'Refunded', cls: 'bg-sky-50 text-sky-700' }
  if (o.paymentMethod === 'cash') return { text: 'Pay on delivery', cls: 'bg-neutral-100 text-neutral-600' }
  return { text: 'Awaiting payment', cls: 'bg-red-50 text-red-700' }
}
