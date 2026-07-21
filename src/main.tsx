import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

// fase de testes: nasce populado com o seed e repopula quando o seed muda de
// versão (bump em SEED_VERSION força reset em todos os aparelhos); /?seed força
const SEED_VERSION = '2'

async function boot() {
  const wantsSeed = new URLSearchParams(location.search).has('seed')
  const desatualizado = localStorage.getItem('mafi-seed-version') !== SEED_VERSION
  if (wantsSeed || desatualizado || !localStorage.getItem('mafi-state')) {
    try {
      const res = await fetch('mafi-seed.json')
      if (res.ok) {
        localStorage.setItem('mafi-state', JSON.stringify(await res.json()))
        localStorage.setItem('mafi-seed-version', SEED_VERSION)
      }
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
