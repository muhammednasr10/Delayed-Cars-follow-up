import './lib/sentry-init'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './Components/AppErrorBoundary'
import './index.css'

if (import.meta.env.PROD) {
  const { registerSW } = await import('virtual:pwa-register')
  const { restoreAppIconBadge } = await import('./Utils/appIconBadge')
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) {
        void restoreAppIconBadge()
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') void restoreAppIconBadge()
          })
        })
      }
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
)
