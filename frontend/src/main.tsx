import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui/Toast'
import { RewardProvider } from './components/game/RewardProvider'

// The demo build is a single static file, so it routes with the URL hash.
const Router = import.meta.env.VITE_DEMO ? HashRouter : BrowserRouter

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => count < 2 && ![401, 402, 403, 404, 422, 423].includes((err as { status?: number }).status ?? 0),
      refetchOnWindowFocus: false,
    },
  },
})

// Android hardware back button → browser history
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('backButton', ({ canGoBack }) => (canGoBack ? history.back() : CapApp.exitApp()))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <ToastProvider>
          <AuthProvider>
            <RewardProvider>
              <App />
            </RewardProvider>
          </AuthProvider>
        </ToastProvider>
      </Router>
    </QueryClientProvider>
  </StrictMode>,
)
