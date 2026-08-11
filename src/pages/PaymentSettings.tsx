import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CreditCard, Plus, Trash2, Wallet } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function PaymentSettingsPage() {
  const [cards, setCards] = useState([
    { id: 1, type: 'Airtel Money', number: '07XX **** 3419', default: true },
    { id: 2, type: 'MTN Mobile Money', number: '07XX **** 1234', default: false },
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">Manage Cards</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {cards.map((card) => (
          <div key={card.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3e6' }}>
                <Wallet size={20} style={{ color: ORANGE }} />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{card.type}</p>
                <p className="text-xs text-gray-500">{card.number}</p>
                {card.default && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 mt-1 inline-block">
                    Default
                  </span>
                )}
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <button
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium"
        >
          <Plus size={20} /> Add Payment Method
        </button>
      </div>
      <Footer />
    </div>
  )
}
