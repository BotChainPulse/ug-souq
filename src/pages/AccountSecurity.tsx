import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Lock, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function AccountSecurityPage() {
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (pin.length >= 4) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">Account Security</h1>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3e6' }}>
              <ShieldCheck size={20} style={{ color: ORANGE }} />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Security PIN</p>
              <p className="text-xs text-gray-500">Set a PIN to protect your account</p>
            </div>
          </div>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 4-6 digit PIN"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none pr-12"
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            onClick={handleSave}
            className="w-full mt-3 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: ORANGE }}
          >
            {saved ? 'Saved!' : 'Save PIN'}
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
          <Lock size={20} className="text-gray-400" />
          <div>
            <p className="font-medium text-sm text-gray-900">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500">Coming soon</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
