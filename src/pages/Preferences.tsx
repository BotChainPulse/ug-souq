import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Settings, Bell, Moon, Globe, ShoppingBag } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    marketingEmails: true,
  })

  const toggle = (key: string) => {
    setPrefs({ ...prefs, [key]: !(prefs as any)[key] })
  }

  const items = [
    { key: 'emailNotifications', label: 'Email Notifications', icon: Bell, desc: 'Get order updates via email' },
    { key: 'smsNotifications', label: 'SMS Notifications', icon: Bell, desc: 'Get order updates via SMS' },
    { key: 'darkMode', label: 'Dark Mode', icon: Moon, desc: 'Switch to dark theme' },
    { key: 'marketingEmails', label: 'Marketing Emails', icon: ShoppingBag, desc: 'Receive deals and offers' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">Preferences</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3e6' }}>
                <item.icon size={18} style={{ color: ORANGE }} />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                (prefs as any)[item.key] ? '' : 'bg-gray-300'
              }`}
              style={{ backgroundColor: (prefs as any)[item.key] ? ORANGE : undefined }}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${
                (prefs as any)[item.key] ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
