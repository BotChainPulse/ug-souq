// rebuild trigger: fresh deploy of fixed orders + wishlist pages
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

const savedTheme = window.localStorage.getItem('ugsouq.theme')
const useDarkTheme = savedTheme === 'dark'
document.documentElement.classList.toggle('dark', useDarkTheme)
document.documentElement.style.colorScheme = useDarkTheme ? 'dark' : 'light'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
