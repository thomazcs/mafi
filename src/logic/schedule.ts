import type { AppState, Patient } from '../types'
import { weekdayOf } from './dates'

export function patientsForDate(state: AppState, date: string): Patient[] {
  const wd = weekdayOf(date)
  return state.patients
    .filter(p => {
      if (p.arquivado) return false
      const skip = state.exceptions.some(e => e.patientId === p.id && e.data === date && e.tipo === 'skip')
      if (skip) return false
      const add = state.exceptions.some(e => e.patientId === p.id && e.data === date && e.tipo === 'add')
      if (add) return true
      return p.diasSemana.includes(wd) && p.dataInicio <= date
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export function isDone(state: AppState, patientId: string, date: string): boolean {
  return state.attendances.some(a => a.patientId === patientId && a.data === date)
}
