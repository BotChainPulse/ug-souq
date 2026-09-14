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

        // The legacy operations console stores the admin key in sessionStorage,
        // while the campaign studio reads localStorage. Keep both in sync so
        // opening Marketing does not bounce back to the admin overview.
        const sessionKey = sessionStorage.getItem('ug_admin_key')
        if (sessionKey && !localStorage.getItem('ug_admin_key')) {
          localStorage.setItem('ug_admin_key', sessionKey)
        }

        navigate('/admin/marketing')
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [location.pathname, navigate])

  return null
}
