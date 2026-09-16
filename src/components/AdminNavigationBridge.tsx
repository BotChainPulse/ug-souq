import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

export default function AdminNavigationBridge() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) return

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest('button')
      if (!button) return

      const label = button.textContent?.replace(/\s+/g, ' ').trim() ?? ''

      if (location.pathname === '/admin/operations' && (label === 'Listings' || label === 'Review Listings')) {
        event.preventDefault()
        event.stopPropagation()
        navigate('/admin/listings')
        return
      }

      if (location.pathname === '/admin/operations' && label === 'Deliveries') {
        event.preventDefault()
        event.stopPropagation()
        navigate('/admin/deliveries')
        return
      }

      if (location.pathname === '/admin/operations' && label === 'Seller Ads') {
        event.preventDefault()
        event.stopPropagation()
        navigate('/admin/ads')
        return
      }

      if (label === 'Marketing' || label === 'Marketing Campaigns' || label.startsWith('Marketing Campaigns ')) {
        event.preventDefault()
        event.stopPropagation()

        navigate('/admin/marketing')
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [location.pathname, navigate])

  return null
}
