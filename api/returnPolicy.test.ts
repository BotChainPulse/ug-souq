import { describe, expect, it } from 'vitest'
import { canMoveReturnStatus, returnWindowMs } from './returnPolicy'

describe('return workflow policy', () => {
  it('permits only the reviewed return sequence', () => {
    expect(canMoveReturnStatus('requested', 'approved')).toBe(true)
    expect(canMoveReturnStatus('approved', 'picked_up')).toBe(true)
    expect(canMoveReturnStatus('picked_up', 'refunded')).toBe(true)
    expect(canMoveReturnStatus('refunded', 'closed')).toBe(true)
    expect(canMoveReturnStatus('requested', 'refunded')).toBe(false)
    expect(canMoveReturnStatus('closed', 'approved')).toBe(false)
  })

  it('uses the shorter food issue window', () => {
    expect(returnWindowMs(true)).toBe(2 * 60 * 60 * 1000)
    expect(returnWindowMs(false)).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
