// The buyer's account on this device (like noon's signed-in profile).
export type Account = { name: string; phone: string; email: string; location: string; deletionToken?: string }

const KEY = 'ugsouq_account'

export function getAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const a = JSON.parse(raw)
    if (a && a.name && a.phone) return { ...a, email: typeof a.email === 'string' ? a.email : '' } as Account
    return null
  } catch {
    return null
  }
}

export function saveAccount(a: Account) {
  localStorage.setItem(KEY, JSON.stringify(a))
  // keep legacy key in sync for My Orders
  localStorage.setItem('ugsouq_myphone', a.phone)
}

export function clearAccount() {
  localStorage.removeItem(KEY)
  localStorage.removeItem('ugsouq_myphone')
}
