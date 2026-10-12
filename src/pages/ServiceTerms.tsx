import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { SERVICE_AGREEMENT } from '../lib/serviceAgreement'
export default function ServiceTerms() {
  return <div className="min-h-screen bg-neutral-50"><Header /><main className="mx-auto max-w-3xl p-4 py-10"><Link to="/services" className="underline text-green-800">Services catalogue</Link><h1 className="text-3xl font-black mt-4">Service-provider agreement</h1><p className="mt-4 border border-amber-200 bg-amber-50 rounded-xl p-4 font-semibold">Draft proposal · 7% labour commission · Payments and final contracts are not activated.</p>{SERVICE_AGREEMENT.map(([heading, body]) => <section key={heading} className="mt-6"><h2 className="text-lg font-bold">{heading}</h2><p className="mt-2 leading-relaxed text-neutral-700">{body}</p></section>)}<p className="mt-6 text-sm">Official checks: <a href="https://ursb.go.ug/services/business-registration/" className="underline">URSB business registration</a> · <a href="https://pdpo.go.ug/" className="underline">Personal Data Protection Office</a>. Support: support@ugsouq.com.</p><Link to="/services/register" className="inline-block mt-8 rounded-xl bg-green-800 px-5 py-3 text-white font-bold">Apply as a provider</Link></main><Footer /></div>
}
