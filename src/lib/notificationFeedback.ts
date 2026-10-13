export type NotificationState = { emailState: string; emailConfigured: boolean; attempts: number; failureCode?: string | null }
export function notificationFeedback(status: NotificationState) {
  if (status.emailState === 'accepted') return 'The email provider accepted this alert. Mailbox delivery is not confirmed; ask the provider to check their inbox and spam folder.'
  if (status.emailState === 'skipped') return ({
    no_email: 'No email address is saved for this provider. They can still open their protected inbox; contact support to correct their account email.',
    account_unavailable: 'The provider account is unavailable. Refresh Services and check the account before notifying again.',
    superseded: 'This alert was not sent because the review or enquiry status has changed. Check the current status.',
    retry_window_expired: 'Automatic retries stopped to avoid sending a duplicate after an uncertain result. Check the email provider’s records or contact support.',
  }[status.failureCode || ''] || 'This alert was not sent. Check the notification record or contact support.')
  if (!status.emailConfigured) return 'The alert is saved, but the server’s email sender is not configured. It remains in the queue; the provider can use their protected inbox.'
  if (status.emailState === 'failed') return status.attempts >= 3 ? 'The email was not confirmed after three attempts. Check the email sender and recipient with support; this button will not create duplicate alerts.' : 'Email sending failed. The saved alert will retry while the server is running; the provider can still open their protected inbox.'
  return status.emailState === 'sending' ? 'Sending the saved alert to the email provider…' : 'Alert queued. Waiting for the email provider; the result will update here.'
}
export function notificationPollInterval(status?: NotificationState) {
  if (!status) return 3000
  if (['accepted','skipped'].includes(status.emailState) || (status.emailState === 'failed' && status.attempts >= 3)) return false
  return status.emailConfigured && status.emailState !== 'failed' ? 3000 : 30_000
}
