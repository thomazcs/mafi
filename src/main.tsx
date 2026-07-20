import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

// dev-only: /?seed carrega prototypes/mafi-seed.json no localStorage (pra testar no mock)
async function boot() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('seed')) {
    try {
      const res = await fetch('/prototypes/mafi-seed.json')
      if (res.ok) localStorage.setItem('mafi-state', JSON.stringify(await res.json()))
    } catch {
      // sem seed disponível — segue com o estado atual
    }
    history.replaceState(null, '', '/')
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
