import { describe, expect, it } from 'vitest'
import { notificationFeedback, notificationPollInterval } from '../src/lib/notificationFeedback'
describe('notification feedback states', () => {
  it('stops polling completed or exhausted events without implying delivery', () => {
    for (const emailState of ['accepted','skipped']) expect(notificationPollInterval({ emailState, attempts: 1, emailConfigured: true })).toBe(false)
    expect(notificationPollInterval({ emailState: 'failed', attempts: 3, emailConfigured: true })).toBe(false)
    expect(notificationFeedback({ emailState: 'failed', attempts: 3, emailConfigured: true })).toContain('not confirmed after three attempts')
  })
  it('polls pending alerts quickly and sender or retry problems less often', () => {
    expect(notificationPollInterval({ emailState: 'pending', attempts: 0, emailConfigured: true })).toBe(3000)
    expect(notificationPollInterval({ emailState: 'failed', attempts: 1, emailConfigured: true })).toBe(30000)
    expect(notificationPollInterval({ emailState: 'pending', attempts: 0, emailConfigured: false })).toBe(30000)
  })
  it('explains missing recipients and expired retry windows', () => {
    expect(notificationFeedback({ emailState: 'skipped', attempts: 0, emailConfigured: true, failureCode: 'no_email' })).toContain('No email address')
    expect(notificationFeedback({ emailState: 'skipped', attempts: 1, emailConfigured: true, failureCode: 'retry_window_expired' })).toContain('avoid sending a duplicate')
  })
})
