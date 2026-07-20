import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

// fase de testes: primeiro acesso (sem dados salvos) nasce populado com o seed;
// /?seed força repopular a qualquer momento
async function boot() {
  const wantsSeed = new URLSearchParams(location.search).has('seed')
  if (wantsSeed || !localStorage.getItem('mafi-state')) {
    try {
      const res = await fetch('mafi-seed.json')
      if (res.ok) localStorage.setItem('mafi-state', JSON.stringify(await res.json()))
    } catch {
      // sem seed disponível — segue com o estado atual
    }
    if (wantsSeed) history.replaceState(null, '', location.pathname)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
