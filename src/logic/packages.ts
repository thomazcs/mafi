import type { AppState, Patient, PackageCycle } from '../types'
import { daysUntilMonthEnd } from './dates'

export function openCycle(state: AppState, patientId: string): PackageCycle | undefined {
  const cycles = state.cycles.filter(c => c.patientId === patientId)
  return cycles[cycles.length - 1]
}

export function sessionsLeft(state: AppState, patientId: string): number | null {
  const patient = state.patients.find(p => p.id === patientId)
  if (!patient || patient.pacote !== 'dez_sessoes') return null
  const cycle = openCycle(state, patientId)
  if (!cycle) return null
  return 10 - cycle.sessoesUsadas
}

export type AlertKind = 'renovar_dez' | 'renovar_mensal'

export function packageAlert(state: AppState, patient: Patient, today: string): AlertKind | null {
  if (patient.pacote === 'dez_sessoes') {
    const left = sessionsLeft(state, patient.id)
    return left !== null && left <= 1 ? 'renovar_dez' : null
  }
  if (patient.pacote === 'mensal') {
    return daysUntilMonthEnd(today) <= 2 ? 'renovar_mensal' : null
  }
  return null
}
