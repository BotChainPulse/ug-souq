import React, { useEffect, useState } from 'react'

export default function DebugToolbar() {
  const [key, setKey] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string>('')

  useEffect(() => {
    try { setKey(sessionStorage.getItem('ugsouq_admin_key')) } catch (e) { setKey(null) }
  }, [])

  const setTestKey = () => {
    try {
      sessionStorage.setItem('ugsouq_admin_key', 'Reagz')
      setKey('Reagz')
      setLastAction('Set test key to Reagz')
      window.location.reload()
    } catch (e) {
      setLastAction('Failed to set key: ' + String(e))
    }
  }

  const clearKey = () => {
    try {
      sessionStorage.removeItem('ugsouq_admin_key')
      setKey(null)
      setLastAction('Cleared admin key')
      window.location.reload()
    } catch (e) {
      setLastAction('Failed to clear key: ' + String(e))
    }
  }

  const copyKey = async () => {
    try {
      if (!key) return setLastAction('No key to copy')
      await navigator.clipboard.writeText(key)
      setLastAction('Key copied to clipboard')
    } catch (e) {
      setLastAction('Copy failed: ' + String(e))
    }
  }

  // Show toolbar when not in production or when ?admin_debug=1 is present
  const isVisible = (import.meta.env.MODE !== 'production') || window.location.search.includes('admin_debug=1')
  if (!isVisible) return null

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999 }}>
      <div style={{ background: '#111827', color: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.2)', minWidth: 240 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Admin Debug Toolbar</div>
        <div style={{ fontSize: 12, marginBottom: 8 }}>Admin key: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{key ?? '—'}</span></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={setTestKey} style={{ padding: '6px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Set test key</button>
          <button onClick={clearKey} style={{ padding: '6px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Clear</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={copyKey} style={{ padding: '6px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Copy key</button>
          <a href="/admin" style={{ padding: '6px 8px', background: '#f59e0b', color: '#111827', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}>Open /admin</a>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', minHeight: 18 }}>{lastAction}</div>
      </div>
    </div>
  )
}
