const ADMIN_SESSION_KEY = 'ug_admin_key'

export function getAdminSessionKey() {
  const sessionKey = sessionStorage.getItem(ADMIN_SESSION_KEY) || ''
  if (sessionKey) return sessionKey

  // One-time migration for administrators who signed in before the dashboard
  // moved away from persistent local storage.
  const legacyKey = localStorage.getItem(ADMIN_SESSION_KEY) || ''
  if (legacyKey) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, legacyKey)
    localStorage.removeItem(ADMIN_SESSION_KEY)
  }
  return legacyKey
}

export function setAdminSessionKey(key: string) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, key)
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

export function clearAdminSessionKey() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  localStorage.removeItem(ADMIN_SESSION_KEY)
}
