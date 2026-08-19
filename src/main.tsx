import './lib/sentry-init'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { restoreAppIconBadge } from './Utils/appIconBadge'
import App from './App'
import { AppErrorBoundary } from './Components/AppErrorBoundary'
import './index.css'

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) {
      void restoreAppIconBadge()
      // Re-apply badge when SW updates and activates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') void restoreAppIconBadge()
        })
      })
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
)
