import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CreditCard, Plus, Trash2, Wallet, X } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function PaymentSettingsPage() {
  const [cards, setCards] = useState([
    { id: 1, type: 'Airtel Money', number: '07XX **** 3419', default: true },
    { id: 2, type: 'MTN Mobile Money', number: '07XX **** 1234', default: false },
  ])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('Airtel Money')
  const [number, setNumber] = useState('')

  const addPaymentMethod = () => {
    if (!number.trim()) return
    setCards((current) => [
      ...current,
      { id: Date.now(), type, number: number.trim(), default: current.length === 0 },
    ])
    setNumber('')
    setType('Airtel Money')
    setShowForm(false)
  }

  const removeCard = (id: number) => setCards((current) => current.filter((card) => card.id !== id))

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
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3e6' }}><Wallet size={20} style={{ color: ORANGE }} /></div>
              <div>
                <p className="font-bold text-sm text-gray-900">{card.type}</p>
                <p className="text-xs text-gray-500">{card.number}</p>
                {card.default && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 mt-1 inline-block">Default</span>}
              </div>
            </div>
            <button onClick={() => removeCard(card.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label={`Remove ${card.type}`}><Trash2 size={18} /></button>
          </div>
        ))}

        {showForm && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add Payment Method</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400" aria-label="Close payment form"><X size={20} /></button>
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm">
              <option>Airtel Money</option><option>MTN Mobile Money</option><option>Visa / Mastercard</option>
            </select>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Phone number or card reference" className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
            <button onClick={addPaymentMethod} disabled={!number.trim()} className="w-full py-2.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}>Save Payment Method</button>
            {type !== 'Visa / Mastercard' && <p className="text-xs text-gray-500">For Mobile Money, use the number registered with your provider.</p>}
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium hover:border-orange-300 hover:text-orange-600">
            <Plus size={20} /> Add Payment Method
          </button>
        )}
      </div>
      <Footer />
    </div>
  )
}
