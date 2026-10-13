export function notificationRetryAllowed(attempts: number, firstAttemptAt: Date | null, now = new Date()) {
  return attempts < 3 && (!firstAttemptAt || now.getTime() - firstAttemptAt.getTime() < 23 * 60 * 60 * 1000)
}
