import type { AppState, Payment, Patient } from '../types'
import { monthOf } from './dates'

export interface FinanceItem { payment: Payment; patient: Patient }
export interface MonthSummary { recebido: number; aReceber: number; items: FinanceItem[] }

export function monthSummary(state: AppState, month: string): MonthSummary {
  let recebido = 0
  let aReceber = 0
  const items: FinanceItem[] = []

  for (const payment of state.payments) {
    if (monthOf(payment.data) !== month) continue
    const patient = state.patients.find(p => p.id === payment.patientId)
    if (!patient) continue
    if (payment.pago) recebido += payment.valor
    else aReceber += payment.valor
    items.push({ payment, patient })
  }

  items.sort((a, b) => {
    if (a.payment.pago !== b.payment.pago) return a.payment.pago ? 1 : -1
    return a.patient.nome.localeCompare(b.patient.nome)
  })

  return { recebido, aReceber, items }
}
