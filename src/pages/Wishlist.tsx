import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { fmt, useCart } from '../lib/cart'

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<string[]>([])
  const { add } = useCart()

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]')
      setWishlist(Array.isArray(saved) ? saved : [])
    } catch {
      setWishlist([])
    }
  }, [])

  const remove = (id: any) => {
    const next = wishlist.filter(w => w !== id)
    setWishlist(next)
    localStorage.setItem('wishlist', JSON.stringify(next))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">My Wishlist</h1>
        <span className="ml-auto text-sm text-gray-500">{wishlist.length} items</span>
      </div>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400 px-4">
          <Heart size={64} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Your wishlist is empty</p>
          <p className="text-sm">Tap the heart icon on any product to save it here</p>
          <Link to="/catalog">
            <button className="mt-6 px-6 py-2.5 rounded-full font-bold text-white" style={{ backgroundColor: ORANGE }}>
              Browse Products
            </button>
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {wishlist.map((id: any) => (
            <div key={String(id)} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Heart size={24} className="text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Product {String(id).slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">Saved to wishlist</p>
                </div>
              </div>
              <button onClick={() => remove(id)} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Footer />
    </div>
  )
}
