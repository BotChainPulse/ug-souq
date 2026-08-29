import { Routes, Route, useLocation } from 'react-router'
import { CartProvider } from './lib/cart'
import ChatBot from './components/ChatBot'
import Home from './pages/Home'
import Sell from './pages/Sell'
import Affiliates from './pages/Affiliates'
import Verification from './pages/Verification'
import Food from './pages/Food'
import Restaurant from './pages/Restaurant'
import Cart from './pages/Cart'
import TrackOrder from './pages/TrackOrder'
import Returns from './pages/Returns'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import SearchResults from './pages/SearchResults'
import SellerListings from './pages/SellerListings'
import Admin from './pages/Admin'
import AdminDashboard from './pages/AdminDashboard'
import AdminLaunch from './pages/AdminLaunch'
import Catalog from './pages/Catalog'
import Boda from './pages/Boda'
import Pay from './pages/Pay'
import MyOrders from './pages/MyOrders'
import OrderDetails from './pages/OrderDetails'
import Account from './pages/Account'
import ProductDetail from './pages/ProductDetail'
import SouqHubs from './pages/SouqHubs'
import GroupBuying from './pages/GroupBuying'
import Deliveries from './pages/Deliveries'
import Notifications from './pages/Notifications'
import Preferences from './pages/Preferences'
import AccountSecurity from './pages/AccountSecurity'
import PaymentSettings from './pages/PaymentSettings'
import Addresses from './pages/Addresses'
import Wishlist from './pages/Wishlist'
import SellerPage from './pages/SellerPage'
import Plus from './pages/Plus'

export default function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <CartProvider>
      {!isAdminRoute && <ChatBot />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/affiliates" element={<Affiliates />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/food" element={<Food />} />
        <Route path="/food/:slug" element={<Restaurant />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/orders/:code" element={<OrderDetails />} />
        <Route path="/account" element={<Account />} />
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/sell/listings" element={<SellerListings />} />
        <Route path="/admin" element={<AdminLaunch />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/operations" element={<Admin />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/seller/:id" element={<SellerPage />} />
        <Route path="/mall" element={<Catalog />} />
        <Route path="/boda" element={<Boda />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/hubs" element={<SouqHubs />} />
        <Route path="/group-buying" element={<GroupBuying />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/account-security" element={<AccountSecurity />} />
        <Route path="/payment-settings" element={<PaymentSettings />} />
        <Route path="/addresses" element={<Addresses />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/plus" element={<Plus />} />
      </Routes>
    </CartProvider>
  )
}