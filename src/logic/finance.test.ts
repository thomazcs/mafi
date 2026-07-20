import { describe, it, expect } from 'vitest'
import { monthSummary } from './finance'
import { initialState, newId, type AppState, type Patient, type Payment } from '../types'

function pac(over: Partial<Patient> = {}): Patient {
  return { id: newId(), nome: 'Ana', nascimento: '', whatsapp: '31999990000', cidade: 'BH',
    diasSemana: [1, 3], dataInicio: '2026-07-01', pacote: 'avulso', valor: 150, arquivado: false, ...over }
}

describe('monthSummary', () => {
  it('soma recebido/aReceber só do mês; pendente primeiro nos items', () => {
    const pago = pac({ nome: 'Zeca' })
    const pendente = pac({ nome: 'Ana' })
    const outroMes = pac({ nome: 'Bia' })

    const payPago: Payment = { id: newId(), patientId: pago.id, ciclo: '2026-07-10', data: '2026-07-10', valor: 400, pago: true, dataPagamento: '2026-07-10' }
    const payPendente: Payment = { id: newId(), patientId: pendente.id, ciclo: '2026-07-12', data: '2026-07-12', valor: 250, pago: false }
    const payOutroMes: Payment = { id: newId(), patientId: outroMes.id, ciclo: '2026-06-01', data: '2026-06-01', valor: 100, pago: false }

    const state: AppState = {
      ...initialState(),
      patients: [pago, pendente, outroMes],
      payments: [payPago, payPendente, payOutroMes],
    }

    const summary = monthSummary(state, '2026-07')
    expect(summary.recebido).toBe(400)
    expect(summary.aReceber).toBe(250)
    expect(summary.items).toHaveLength(2)
    expect(summary.items[0].payment.pago).toBe(false)
    expect(summary.items[0].patient).toEqual(pendente)
    expect(summary.items[1].patient).toEqual(pago)
  })
})
