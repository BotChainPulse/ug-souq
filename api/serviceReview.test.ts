import { describe, expect, it } from 'vitest'
import { serviceReviewProblem } from '../src/lib/serviceReview'
describe('provider review validation', () => {
  it('requires substantive notes for every decision and completed checks for approval', () => {
    expect(serviceReviewProblem('approved','          ',true)).toContain('10 characters')
    expect(serviceReviewProblem('approved','Checked contact and skills',false)).toContain('tick the confirmation')
    expect(serviceReviewProblem('approved','Checked contact and skills',true)).toBeNull()
    expect(serviceReviewProblem('rejected','The supplied details are incomplete',false)).toBeNull()
    expect(serviceReviewProblem('suspended','Open customer complaint requires review',false)).toBeNull()
    expect(serviceReviewProblem('approved','x'.repeat(1001),true)).toContain('1,000')
  })
})
