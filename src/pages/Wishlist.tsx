import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Heart, Loader2, ShoppingCart, Store, Trash2 } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { fmt, useCart } from '../lib/cart'
import { trpc } from '@/providers/trpc'
import { loadWishlist, saveWishlist } from '../lib/wishlist'

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<string[]>(loadWishlist)
  const [added, setAdded] = useState<string | null>(null)
  const { add } = useCart()
  const products = trpc.products.browse.useQuery({})

  const savedItems = wishlist.map((key) => ({
    key,
    item: products.data?.find((item) => `${item.kind}-${item.id}` === key),
  }))

  const remove = (key: string) => {
    const next = wishlist.filter((item) => item !== key)
    setWishlist(next)
    saveWishlist(next)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">My Wishlist</h1>
        <span className="ml-auto text-sm text-gray-500">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}</span>
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
      ) : products.isLoading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-20 text-sm font-medium text-gray-500"><Loader2 size={20} className="animate-spin" /> Loading saved products…</div>
      ) : products.error ? (
        <div className="mx-4 my-6 rounded-xl border border-red-200 bg-white p-5 text-center">
          <p className="font-bold text-red-700">We couldn’t load your saved products.</p>
          <p className="mt-1 text-sm text-gray-500">Your wishlist is still saved on this device.</p>
          <button type="button" onClick={() => products.refetch()} className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white" style={{ backgroundColor: ORANGE }}>Try again</button>
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-3 px-4 py-4 sm:grid-cols-2">
          {savedItems.map(({ key, item }) => item ? (
            <article key={key} className="relative flex gap-3 rounded-xl bg-white p-3 pr-11 shadow-sm ring-1 ring-gray-100">
              <Link to={item.kind === 'product' ? `/product/${item.slug}` : `/seller/${item.sellerId}`} className="shrink-0">
                <img src={item.image || '/images/product-default.png'} alt={item.name} className="h-24 w-24 rounded-lg bg-neutral-50 object-contain p-2 sm:h-28 sm:w-28" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-emerald-700">{item.sellerName}</p>
                <Link to={item.kind === 'product' ? `/product/${item.slug}` : `/seller/${item.sellerId}`} className="mt-1 block text-sm font-bold leading-snug text-gray-900 hover:text-orange-600">{item.name}</Link>
                <p className="mt-1 font-extrabold" style={{ color: ORANGE }}>{fmt(item.price)}</p>
                {item.kind === 'product' ? (
                  <button
                    type="button"
                    disabled={item.stock <= 0}
                    onClick={() => {
                      add({ itemType: 'product', itemId: item.id, name: item.name, price: item.price, image: item.image, sellerId: item.sellerId, sellerName: item.sellerName })
                      setAdded(key)
                      setTimeout(() => setAdded(null), 1200)
                    }}
                    className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white disabled:bg-gray-300"
                    style={item.stock > 0 ? { backgroundColor: added === key ? '#16a34a' : ORANGE } : undefined}
                  >
                    <ShoppingCart size={14} /> {item.stock <= 0 ? 'Out of stock' : added === key ? 'Added' : 'Add to cart'}
                  </button>
                ) : (
                  <Link to={`/seller/${item.sellerId}`} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white"><Store size={14} /> View seller</Link>
                )}
              </div>
              <button type="button" onClick={() => remove(key)} aria-label={`Remove ${item.name} from wishlist`} className="absolute right-2 top-2 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </article>
          ) : (
            <article key={key} className="relative rounded-xl bg-white p-4 pr-12 shadow-sm ring-1 ring-gray-100">
              <p className="font-bold text-gray-700">Saved item unavailable</p>
              <p className="mt-1 text-sm text-gray-500">This item may have been removed from sale.</p>
              <button type="button" onClick={() => remove(key)} aria-label="Remove unavailable item from wishlist" className="absolute right-2 top-2 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={18} /></button>
            </article>
          ))}
        </div>
      )}
      <Footer />
    </div>
  )
}
