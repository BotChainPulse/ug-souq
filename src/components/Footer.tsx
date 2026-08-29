import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { WA_LINK } from '../lib/site'

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t border-neutral-800 py-1 sm:border-0 sm:py-0 sm:[&>ul]:!block">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between py-2 font-bold text-white marker:content-none sm:pointer-events-none sm:min-h-0 sm:cursor-default sm:py-0 [&::-webkit-details-marker]:hidden">
        {title}<ChevronDown size={17} className="text-neutral-400 transition group-open:rotate-180 sm:hidden" />
      </summary>
      <ul className="space-y-2 pb-3 text-sm text-neutral-300 sm:mt-3 sm:pb-0">{children}</ul>
    </details>
  )
}

export default function Footer() {
  return (
    <footer className="mt-10 bg-neutral-950 text-neutral-200 sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:grid-cols-4 sm:gap-8 sm:py-10">
        <div className="pb-1">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-white text-lg">UG Souq</span>
          </div>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">Uganda's market, in your pocket. Proudly built in Kampala.</p>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"><MessageCircle size={15} /> WhatsApp support</a>
        </div>
        <FooterGroup title="Shop">
            <li><Link to="/mall" className="hover:text-white">Super Mall</Link></li>
            <li><Link to="/catalog?deals=1" className="hover:text-white">Today's Deals</Link></li>
            <li><Link to="/food" className="hover:text-white">UG Souq Food</Link></li>
            <li><Link to="/catalog?category=agriculture&title=UG%20Souq%20Fresh" className="hover:text-white">UG Souq Fresh — fruits & vegetables</Link></li>
            <li><Link to="/catalog?category=agriculture&title=Farm%20Direct" className="hover:text-white">Farm Direct</Link></li>
            <li><Link to="/catalog?condition=refurbished" className="hover:text-white">Refurbished</Link></li>
        </FooterGroup>
        <FooterGroup title="Sell & Earn">
            <li><Link to="/sell" className="hover:text-white">Open a shop</Link></li>
            <li><Link to="/sell/listings" className="hover:text-white">List an item</Link></li>
            <li><Link to="/verification" className="hover:text-white">Get verified</Link></li>
            <li><Link to="/affiliates" className="hover:text-white">Affiliate program</Link></li>
            <li><Link to="/boda" className="hover:text-white">Boda Send delivery</Link></li>
            <li><Link to="/pay" className="hover:text-white">UG Souq Pay</Link></li>
        </FooterGroup>
        <FooterGroup title="Support">
            <li><a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp support</a></li>
            <li><Link to="/account" className="hover:text-white">My Account</Link></li>
            <li><Link to="/orders" className="hover:text-white">My Orders</Link></li>
            <li><Link to="/track" className="hover:text-white">Track your order</Link></li>
            <li><Link to="/returns" className="hover:text-white">Returns & refunds</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy & data protection</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms & conditions</Link></li>
        </FooterGroup>
      </div>
      <div className="border-t border-neutral-800 px-4 pb-24 pt-4 text-center text-[11px] leading-relaxed text-neutral-500 sm:pb-4">
        © 2026 UG Souq Ltd · Kampala, Uganda<br className="sm:hidden" /> · MTN MoMo & Airtel Money accepted
      </div>
    </footer>
  )
}
