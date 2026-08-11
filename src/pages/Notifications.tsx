import { Link } from 'react-router'
import { ArrowLeft, Bell, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function NotificationsPage() {
  const notifications = [
    { id: 1, title: 'Order Confirmed', msg: 'Your order US-5VKT8 has been confirmed.', time: '2 hours ago', type: 'success' },
    { id: 2, title: 'Payment Received', msg: 'Payment for US-FVCN3 received via Airtel Money.', time: '1 day ago', type: 'info' },
    { id: 3, title: 'Item Shipped', msg: 'Your Classic Rolex is on the way to Mpigi.', time: '2 days ago', type: 'success' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              n.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {n.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-900">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.msg}</p>
              <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
