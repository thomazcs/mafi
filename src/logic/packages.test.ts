import { describe, it, expect } from 'vitest'
import { openCycle, sessionsLeft, packageAlert } from './packages'
import { reduce } from '../store/reducer'
import { initialState, newId, type Patient } from '../types'

function pac(over: Partial<Patient> = {}): Patient {
  return { id: newId(), nome: 'Ana', nascimento: '', whatsapp: '31999990000', cidade: 'BH',
    diasSemana: [1, 3], dataInicio: '2026-07-01', pacote: 'dez_sessoes', valor: 900, arquivado: false, ...over }
}

describe('sessionsLeft', () => {
  it('10 sessões cheias, depois de 2 checks fica 8', () => {
    const p = pac()
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(sessionsLeft(state, p.id)).toBe(10)
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-06' })
    state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: '2026-07-08' })
    expect(sessionsLeft(state, p.id)).toBe(8)
  })

  it('null se não for dez_sessoes', () => {
    const p = pac({ pacote: 'avulso' })
    const state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(sessionsLeft(state, p.id)).toBeNull()
  })

  it('null se dez_sessoes sem ciclo', () => {
    const p = pac()
    const state = { ...initialState(), patients: [p] } // sem ciclo criado manualmente
    expect(sessionsLeft(state, p.id)).toBeNull()
  })
})

describe('openCycle', () => {
  it('retorna o último ciclo do array', () => {
    const p = pac()
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    state = reduce(state, { type: 'RENEW_PACKAGE', patientId: p.id, data: '2026-08-01' })
    expect(state.cycles).toHaveLength(2)
    expect(openCycle(state, p.id)).toEqual(state.cycles[1])
  })
})

describe('packageAlert', () => {
  it('dez com 1 sessão restante → renovar_dez', () => {
    const p = pac()
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    for (let i = 0; i < 9; i++) {
      state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: `2026-07-${String(6 + i).padStart(2, '0')}` })
    }
    expect(sessionsLeft(state, p.id)).toBe(1)
    expect(packageAlert(state, p, '2026-07-20')).toBe('renovar_dez')
  })

  it('dez com 2 sessões restantes → null', () => {
    const p = pac()
    let state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    for (let i = 0; i < 8; i++) {
      state = reduce(state, { type: 'CHECK_ATTENDANCE', patientId: p.id, data: `2026-07-${String(6 + i).padStart(2, '0')}` })
    }
    expect(sessionsLeft(state, p.id)).toBe(2)
    expect(packageAlert(state, p, '2026-07-20')).toBeNull()
  })

  it('mensal: dia 29/07 → renovar_mensal', () => {
    const p = pac({ pacote: 'mensal', valor: 400 })
    const state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(packageAlert(state, p, '2026-07-29')).toBe('renovar_mensal')
  })

  it('mensal: dia 20/07 → null', () => {
    const p = pac({ pacote: 'mensal', valor: 400 })
    const state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(packageAlert(state, p, '2026-07-20')).toBeNull()
  })

  it('avulso sempre null', () => {
    const p = pac({ pacote: 'avulso', valor: 150 })
    const state = reduce(initialState(), { type: 'ADD_PATIENT', patient: p })
    expect(packageAlert(state, p, '2026-07-29')).toBeNull()
  })
})
