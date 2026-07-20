import { describe, it, expect } from 'vitest'
import { reduce } from './reducer'
import { initialState, newId, type AppState, type Patient } from '../types'

function pac(over: Partial<Patient> = {}): Patient {
  return { id: newId(), nome: 'Ana', nascimento: '', whatsapp: '31999990000', cidade: 'BH',
    diasSemana: [1, 3], dataInicio: '2026-07-01', pacote: 'mensal', valor: 400, arquivado: false, ...over }
}

describe('reduce', () => {
  it('ADD_PATIENT mensal: adiciona em patients, não cria cycle nem payment', () => {
    const p = pac()
    const state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(state.patients).toEqual([p])
    expect(state.cycles).toEqual([])
    expect(state.payments).toEqual([])
  })

  it('ADD_PATIENT dez_sessoes: cria 1 PackageCycle e 1 Payment não pago', () => {
    const p = pac({ pacote: 'dez_sessoes', valor: 900, dataInicio: '2026-07-05' })
    const state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(state.patients).toEqual([p])
    expect(state.cycles).toHaveLength(1)
    expect(state.cycles[0]).toMatchObject({ patientId: p.id, inicio: '2026-07-05', sessoesUsadas: 0 })
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({
      patientId: p.id,
      ciclo: state.cycles[0].id,
      valor: 900,
      pago: false,
    })
  })

  it('REMOVE_PATIENT limpa patients, exceptions, attendances, payments, cycles do paciente', () => {
    const p = pac({ pacote: 'dez_sessoes' })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, { type: 'ADD_EXCEPTION', exception: { id: newId(), patientId: p.id, data: '2026-07-06', tipo: 'skip' } })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-06' })
    expect(state.exceptions).toHaveLength(1)
    expect(state.attendances).toHaveLength(1)
    expect(state.payments).toHaveLength(1)
    expect(state.cycles).toHaveLength(1)

    state = reduce(state, { type: 'REMOVE_PATIENT', id: p.id })
    expect(state.patients).toEqual([])
    expect(state.exceptions).toEqual([])
    expect(state.attendances).toEqual([])
    expect(state.payments).toEqual([])
    expect(state.cycles).toEqual([])
  })

  it('CHECK_ATTENDANCE (dez_sessoes): cria attendance e incrementa sessoesUsadas do ciclo', () => {
    const p = pac({ pacote: 'dez_sessoes' })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-08' })
    expect(state.attendances).toHaveLength(1)
    expect(state.attendances[0]).toMatchObject({ patientId: p.id, data: '2026-07-08' })
    expect(state.cycles[0].sessoesUsadas).toBe(1)
  })

  it('CHECK_ATTENDANCE avulso: cria attendance + payment não pago com ciclo=data e valor do paciente', () => {
    const p = pac({ pacote: 'avulso', valor: 150 })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-08' })
    expect(state.attendances).toHaveLength(1)
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({ patientId: p.id, ciclo: '2026-07-08', valor: 150, pago: false })
  })

  it('CHECK_ATTENDANCE duplicado (mesmo patientId+data): não duplica attendance nem incrementa de novo', () => {
    const p = pac({ pacote: 'dez_sessoes' })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-08' })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-08' })
    expect(state.attendances).toHaveLength(1)
    expect(state.cycles[0].sessoesUsadas).toBe(1)
  })

  it('UNCHECK_ATTENDANCE dez: remove attendance e decrementa; avulso: remove o payment daquela data', () => {
    const dez = pac({ pacote: 'dez_sessoes' })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: dez })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: dez.id, data: '2026-07-08' })
    state = reduce(state, { type: 'UNCHECK_ATTENDANCE', patientId: dez.id, data: '2026-07-08' })
    expect(state.attendances).toEqual([])
    expect(state.cycles[0].sessoesUsadas).toBe(0)

    const avulso = pac({ pacote: 'avulso', valor: 150 })
    state = reduce(state, { type: 'ADD_PATIENT', patient: avulso })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: avulso.id, data: '2026-07-09' })
    expect(state.payments.filter(pay => pay.patientId === avulso.id)).toHaveLength(1)
    state = reduce(state, { type: 'UNCHECK_ATTENDANCE', patientId: avulso.id, data: '2026-07-09' })
    expect(state.attendances).toEqual([])
    expect(state.payments.filter(pay => pay.patientId === avulso.id)).toEqual([])
  })

  it('RENEW_PACKAGE: dez com ciclo sessoesUsadas 9 → novo ciclo zerado + novo payment; ciclo antigo permanece', () => {
    const p = pac({ pacote: 'dez_sessoes', valor: 900 })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    const oldCycleId = state.cycles[0].id
    state = { ...state, cycles: state.cycles.map(c => c.id === oldCycleId ? { ...c, sessoesUsadas: 9 } : c) }
    state = reduce(state, { type: 'RENEW_PACKAGE', patientId: p.id, data: '2026-08-01' })
    expect(state.cycles).toHaveLength(2)
    const oldCycle = state.cycles.find(c => c.id === oldCycleId)!
    expect(oldCycle.sessoesUsadas).toBe(9)
    const newCycle = state.cycles.find(c => c.id !== oldCycleId)!
    expect(newCycle).toMatchObject({ patientId: p.id, inicio: '2026-08-01', sessoesUsadas: 0 })
    expect(state.payments).toHaveLength(2)
    const newPayment = state.payments.find(pay => pay.ciclo === newCycle.id)!
    expect(newPayment).toMatchObject({ patientId: p.id, valor: 900, pago: false })
  })

  it('ENSURE_MONTHLY_PAYMENTS 2026-07: cria payment ciclo=2026-07 pra mensal ativo; idempotente; ignora arquivado/futuro/não-mensal', () => {
    const ativo = pac({ pacote: 'mensal', dataInicio: '2026-07-01' })
    const arquivado = pac({ pacote: 'mensal', dataInicio: '2026-07-01', arquivado: true })
    const futuro = pac({ pacote: 'mensal', dataInicio: '2026-09-01' })
    const avulso = pac({ pacote: 'avulso', dataInicio: '2026-07-01' })
    const dez = pac({ pacote: 'dez_sessoes', dataInicio: '2026-07-01' })

    let state = initialState()
    for (const p of [ativo, arquivado, futuro, avulso, dez]) {
      state = reduce(state, { type: 'ADD_PATIENT', patient: p })
    }
    state = reduce(state, { type: 'ENSURE_MONTHLY_PAYMENTS', month: '2026-07' })
    const monthlyPayments = state.payments.filter(pay => pay.ciclo === '2026-07')
    expect(monthlyPayments).toHaveLength(1)
    expect(monthlyPayments[0]).toMatchObject({ patientId: ativo.id, data: '2026-07-01' })

    // segunda chamada não duplica
    state = reduce(state, { type: 'ENSURE_MONTHLY_PAYMENTS', month: '2026-07' })
    expect(state.payments.filter(pay => pay.ciclo === '2026-07')).toHaveLength(1)
  })

  it('SET_PAID true seta pago e dataPagamento; false limpa ambos', () => {
    const p = pac({ pacote: 'avulso', valor: 150 })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-08' })
    const paymentId = state.payments[0].id
    state = reduce(state, { type: 'SET_PAID', paymentId, pago: true, data: '2026-07-10' })
    expect(state.payments[0]).toMatchObject({ pago: true, dataPagamento: '2026-07-10' })
    state = reduce(state, { type: 'SET_PAID', paymentId, pago: false, data: '2026-07-10' })
    expect(state.payments[0].pago).toBe(false)
    expect(state.payments[0].dataPagamento).toBeUndefined()
  })

  it('UPDATE_PATIENT avulso→dez_sessoes cria ciclo+payment; mensal→mensal não cria nada', () => {
    const p = pac({ pacote: 'avulso', valor: 150, dataInicio: '2026-07-01' })
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    const updated: Patient = { ...p, pacote: 'dez_sessoes', valor: 900 }
    state = reduce(state, { type: 'UPDATE_PATIENT', patient: updated })
    expect(state.patients[0]).toEqual(updated)
    expect(state.cycles).toHaveLength(1)
    expect(state.payments).toHaveLength(1)
    expect(state.payments[0]).toMatchObject({ ciclo: state.cycles[0].id, valor: 900, pago: false })

    const m = pac({ pacote: 'mensal' })
    state = reduce(state, { type: 'ADD_PATIENT', patient: m })
    const mUpdated: Patient = { ...m, nome: 'Outro Nome' }
    state = reduce(state, { type: 'UPDATE_PATIENT', patient: mUpdated })
    expect(state.patients.find(pt => pt.id === m.id)).toEqual(mUpdated)
    expect(state.cycles).toHaveLength(1)
    expect(state.payments).toHaveLength(1)
  })

  it('ADD_EXCEPTION add sobre skip existente remove o skip (add vence, fica visível)', () => {
    const p = pac()
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, {
      type: 'ADD_EXCEPTION',
      exception: { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'skip' },
    })
    state = reduce(state, {
      type: 'ADD_EXCEPTION',
      exception: { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'add' },
    })
    const excOfDay = state.exceptions.filter(e => e.patientId === p.id && e.data === '2026-07-20')
    expect(excOfDay).toHaveLength(1)
    expect(excOfDay[0].tipo).toBe('add')
  })

  it('ADD_EXCEPTION skip sobre add existente remove o add', () => {
    const p = pac()
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, {
      type: 'ADD_EXCEPTION',
      exception: { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'add' },
    })
    state = reduce(state, {
      type: 'ADD_EXCEPTION',
      exception: { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'skip' },
    })
    const excOfDay = state.exceptions.filter(e => e.patientId === p.id && e.data === '2026-07-20')
    expect(excOfDay).toHaveLength(1)
    expect(excOfDay[0].tipo).toBe('skip')
  })

  it('IMPORT_STATE substitui o estado inteiro', () => {
    const p = pac()
    const imported: AppState = { ...initialState(), patients: [p] }
    const state = reduce(initialState(), { type: 'IMPORT_STATE', state: imported })
    expect(state).toEqual(imported)
  })
})
