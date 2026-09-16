export const RETURN_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['approved', 'rejected'],
  approved: ['picked_up', 'rejected'],
  picked_up: ['refunded'],
  refunded: ['closed'],
  rejected: ['closed'],
  closed: [],
}

export function canMoveReturnStatus(current: string, next: string) {
  return current === next || Boolean(RETURN_TRANSITIONS[current]?.includes(next))
}

export function returnWindowMs(foodOrder: boolean) {
  return foodOrder ? 2 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
}
