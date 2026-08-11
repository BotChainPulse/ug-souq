import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, MapPin, Plus, Home, Briefcase, Trash2 } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([
    { id: 1, label: 'Home', address: 'Mpigi District, Uganda', phone: '0708813419', default: true },
    { id: 2, label: 'Work', address: 'Kampala, Uganda', phone: '0708813419', default: false },
  ])

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
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3e6' }}>
                  <MapPin size={20} style={{ color: ORANGE }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">{addr.label}</p>
                    {addr.default && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{addr.address}</p>
                  <p className="text-xs text-gray-400">{addr.phone}</p>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        <button
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 font-medium"
        >
          <Plus size={20} /> Add New Address
        </button>
      </div>
      <Footer />
    </div>
  )
}
