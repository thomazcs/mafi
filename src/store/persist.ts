import type { AppState } from '../types'
import { initialState } from '../types'

const KEY = 'mafi-state'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const parsed = parseImport(raw)
    return parsed ?? initialState()
  } catch {
    return initialState()
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ignore quota/serialization errors — persistência é best-effort
  }
}

export function parseImport(text: string): AppState | null {
  try {
    const data = JSON.parse(text) as unknown
    if (!data || typeof data !== 'object') return null
    const s = data as Partial<AppState>
    if (s.schemaVersion !== 1) return null
    if (
      !Array.isArray(s.patients) ||
      !Array.isArray(s.exceptions) ||
      !Array.isArray(s.attendances) ||
      !Array.isArray(s.payments) ||
      !Array.isArray(s.cycles)
    ) {
      return null
    }
    if (!s.settings || typeof s.settings !== 'object') return null
    return s as AppState
  } catch {
    return null
  }
}

export function exportJSON(s: AppState): void {
  const today = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mafi-backup-${today}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
