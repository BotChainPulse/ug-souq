import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

export default function AdminNavigationBridge() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname !== '/admin/operations') return

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest('button')
      if (!button) return

      const label = button.textContent?.replace(/\s+/g, ' ').trim() ?? ''

      if (label === 'Listings' || label === 'Review Listings') {
        event.preventDefault()
        event.stopPropagation()
        navigate('/admin/listings')
        return
      }

      if (label === 'Deliveries') {
        event.preventDefault()
        event.stopPropagation()
        navigate('/admin/deliveries')
        return
      }

      if (label === 'Seller Ads') {
        event.preventDefault()
        event.stopPropagation()
        navigate('/admin/ads')
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [location.pathname, navigate])

  return null
}
