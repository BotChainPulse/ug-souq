import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'

export default function Footer() {
  return (
    <footer className="mt-16 bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-12 grid sm:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-white text-lg">UG Souq</span>
          </div>
          <p className="mt-3 text-neutral-400">Uganda's market, in your pocket. Proudly built in Kampala.</p>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold"><MessageCircle size={14} /> Chat with us on WhatsApp</a>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">Shop</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><Link to="/mall" className="hover:text-white">Super Mall</Link></li>
            <li><Link to="/catalog?deals=1" className="hover:text-white">Today's Deals</Link></li>
            <li><Link to="/food" className="hover:text-white">UG Souq Food</Link></li>
            <li><Link to="/catalog?category=agriculture&title=UG%20Souq%20Fresh" className="hover:text-white">UG Souq Fresh — fruits & vegetables</Link></li>
            <li><Link to="/catalog?category=agriculture&title=Farm%20Direct" className="hover:text-white">Farm Direct</Link></li>
            <li><Link to="/catalog?condition=refurbished" className="hover:text-white">Refurbished</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">Sell & Earn</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><Link to="/sell" className="hover:text-white">Open a shop</Link></li>
            <li><Link to="/sell/listings" className="hover:text-white">List an item</Link></li>
            <li><Link to="/verification" className="hover:text-white">Get verified</Link></li>
            <li><Link to="/affiliates" className="hover:text-white">Affiliate program</Link></li>
            <li><Link to="/boda" className="hover:text-white">Boda Send delivery</Link></li>
            <li><Link to="/pay" className="hover:text-white">UG Souq Pay</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">Support</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp support</a></li>
            <li><Link to="/account" className="hover:text-white">My Account</Link></li>
            <li><Link to="/orders" className="hover:text-white">My Orders</Link></li>
            <li><Link to="/track" className="hover:text-white">Track your order</Link></li>
            <li><Link to="/returns" className="hover:text-white">Returns & refunds</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy & data protection</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms & conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">
        © 2026 UG Souq Ltd · Kampala, Uganda · MTN MoMo & Airtel Money accepted
      </div>
    </footer>
  )
}
