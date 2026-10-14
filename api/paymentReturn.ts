// Keep hosted payment returns on the application's registered order-details route.
export function paymentReturnPath(orderCode: string | null | undefined, status: string) {
  const path = orderCode ? `/orders/${encodeURIComponent(orderCode)}` : '/orders'
  return `${path}?payment=${encodeURIComponent(status)}`
}
