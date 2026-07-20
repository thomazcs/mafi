import { describe, it, expect } from 'vitest'
import { patientsForDate, isDone } from './schedule'
import { initialState, newId, type AppState, type Patient, type ExceptionEntry } from '../types'

function pac(over: Partial<Patient> = {}): Patient {
  return { id: newId(), nome: 'Ana', nascimento: '', whatsapp: '31999990000', cidade: 'BH',
    diasSemana: [1, 3], dataInicio: '2026-07-01', pacote: 'mensal', valor: 400, arquivado: false, ...over }
}

describe('patientsForDate', () => {
  it('recorrência básica: seg/qua aparece na segunda, não na terça', () => {
    const p = pac({ diasSemana: [1, 3] })
    const state: AppState = { ...initialState(), patients: [p] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([p]) // segunda
    expect(patientsForDate(state, '2026-07-21')).toEqual([]) // terça
  })

  it('dataInicio futura não aparece', () => {
    const p = pac({ diasSemana: [1], dataInicio: '2026-08-01' })
    const state: AppState = { ...initialState(), patients: [p] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([])
  })

  it('arquivado não aparece', () => {
    const p = pac({ diasSemana: [1], arquivado: true })
    const state: AppState = { ...initialState(), patients: [p] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([])
  })

  it('skip remove paciente do dia', () => {
    const p = pac({ diasSemana: [1] })
    const exc: ExceptionEntry = { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'skip' }
    const state: AppState = { ...initialState(), patients: [p], exceptions: [exc] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([])
  })

  it('add inclui paciente em dia fora do padrão', () => {
    const p = pac({ diasSemana: [1] })
    const exc: ExceptionEntry = { id: newId(), patientId: p.id, data: '2026-07-22', tipo: 'add' } // quarta
    const state: AppState = { ...initialState(), patients: [p], exceptions: [exc] }
    expect(patientsForDate(state, '2026-07-22')).toEqual([p])
  })

  it('apenas add (sem skip) na mesma data: paciente aparece no dia', () => {
    const p = pac({ diasSemana: [1] })
    const add: ExceptionEntry = { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'add' }
    const state: AppState = { ...initialState(), patients: [p], exceptions: [add] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([p])
  })

  it('skip no dia padrão + add em outro dia: move o atendimento', () => {
    const p = pac({ diasSemana: [1] })
    const skip: ExceptionEntry = { id: newId(), patientId: p.id, data: '2026-07-20', tipo: 'skip' }
    const add: ExceptionEntry = { id: newId(), patientId: p.id, data: '2026-07-22', tipo: 'add' }
    const state: AppState = { ...initialState(), patients: [p], exceptions: [skip, add] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([])
    expect(patientsForDate(state, '2026-07-22')).toEqual([p])
  })

  it('ordenação por nome', () => {
    const b = pac({ nome: 'Bruno', diasSemana: [1] })
    const a = pac({ nome: 'Ana', diasSemana: [1] })
    const state: AppState = { ...initialState(), patients: [b, a] }
    expect(patientsForDate(state, '2026-07-20')).toEqual([a, b])
  })
})

describe('isDone', () => {
  it('true quando há attendance', () => {
    const p = pac()
    const state: AppState = { ...initialState(), patients: [p], attendances: [{ id: newId(), patientId: p.id, data: '2026-07-20' }] }
    expect(isDone(state, p.id, '2026-07-20')).toBe(true)
  })
  it('false quando não há attendance', () => {
    const p = pac()
    const state: AppState = { ...initialState(), patients: [p] }
    expect(isDone(state, p.id, '2026-07-20')).toBe(false)
  })
})
