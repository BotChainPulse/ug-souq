import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Bell, Moon, ShoppingBag } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

type Preferences = {
  emailNotifications: boolean
  smsNotifications: boolean
  darkMode: boolean
  marketingEmails: boolean
}

type PreferenceKey = keyof Preferences

const DEFAULT_PREFS: Preferences = {
  emailNotifications: true,
  smsNotifications: false,
  darkMode: false,
  marketingEmails: true,
}

const PREFS_KEY = 'ugsouq.preferences'
const THEME_KEY = 'ugsouq.theme'

function loadPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS

  try {
    const saved = window.localStorage.getItem(PREFS_KEY)
    const parsed = saved ? JSON.parse(saved) : {}
    const savedTheme = window.localStorage.getItem(THEME_KEY)
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      darkMode: savedTheme ? savedTheme === 'dark' : Boolean(parsed.darkMode),
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  window.localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences)

  const toggle = (key: PreferenceKey) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))

    if (key === 'darkMode') applyTheme(next.darkMode)
  }

  const items: Array<{ key: PreferenceKey; label: string; icon: typeof Bell; desc: string }> = [
    { key: 'emailNotifications', label: 'Email Notifications', icon: Bell, desc: 'Get order updates via email' },
    { key: 'smsNotifications', label: 'SMS Notifications', icon: Bell, desc: 'Get order updates via SMS' },
    { key: 'darkMode', label: 'Dark Mode', icon: Moon, desc: 'Switch to dark theme' },
    { key: 'marketingEmails', label: 'Marketing Emails', icon: ShoppingBag, desc: 'Receive deals and offers' },
  ]

  return (
    <div className="ugsouq-page-bg min-h-screen text-neutral-900 dark:text-neutral-100">
      <Header />
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <Link to="/account" aria-label="Back to account"><ArrowLeft size={24} className="text-gray-700 dark:text-neutral-200" /></Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Preferences</h1>
      </div>
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur transition-colors dark:border-neutral-800 dark:bg-neutral-900/90">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 dark:bg-orange-950/40">
                <item.icon size={18} style={{ color: ORANGE }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">{item.desc}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[item.key]}
              aria-label={item.label}
              onClick={() => toggle(item.key)}
              className={`relative h-7 w-12 rounded-full transition-colors ${prefs[item.key] ? '' : 'bg-gray-300 dark:bg-neutral-700'}`}
              style={{ backgroundColor: prefs[item.key] ? ORANGE : undefined }}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${prefs[item.key] ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
