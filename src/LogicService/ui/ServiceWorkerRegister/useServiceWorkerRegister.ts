import { useEffect } from 'react'

export function useServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) =>
        console.error('[SW] Registration failed:', err)
      )
    }
  }, [])
}
