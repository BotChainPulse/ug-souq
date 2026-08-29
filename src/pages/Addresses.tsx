import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, MapPin, Plus, Trash2, X } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([
    { id: 1, label: 'Home', address: 'Mpigi District, Uganda', phone: '0708813419', default: true },
    { id: 2, label: 'Work', address: 'Kampala, Uganda', phone: '0708813419', default: false },
  ])
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('Home')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const addAddress = () => {
    if (!address.trim() || !phone.trim()) return
    setAddresses((current) => [
      ...current,
      { id: Date.now(), label: label.trim() || 'Other', address: address.trim(), phone: phone.trim(), default: current.length === 0 },
    ])
    setLabel('Home')
    setAddress('')
    setPhone('')
    setShowForm(false)
  }

  const removeAddress = (id: number) => setAddresses((current) => current.filter((item) => item.id !== id))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">My Addresses</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3e6' }}><MapPin size={20} style={{ color: ORANGE }} /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">{addr.label}</p>
                    {addr.default && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">Default</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{addr.address}</p>
                  <p className="text-xs text-gray-400">{addr.phone}</p>
                </div>
              </div>
              <button onClick={() => removeAddress(addr.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label={`Remove ${addr.label} address`}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}

        {showForm && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add New Address</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400" aria-label="Close address form"><X size={20} /></button>
            </div>
            <select value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm">
              <option>Home</option><option>Work</option><option>Other</option>
            </select>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address / District" className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
            <button onClick={addAddress} disabled={!address.trim() || !phone.trim()} className="w-full py-2.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}>Save Address</button>
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium hover:border-orange-300 hover:text-orange-600">
            <Plus size={20} /> Add New Address
          </button>
        )}
      </div>
      <Footer />
    </div>
  )
}
