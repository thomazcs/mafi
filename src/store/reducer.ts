import type { AppState, Patient, ExceptionEntry, Settings } from '../types'
import { newId } from '../types'

export type Action =
  | { type: 'ADD_PATIENT'; patient: Patient }
  | { type: 'UPDATE_PATIENT'; patient: Patient }
  | { type: 'REMOVE_PATIENT'; id: string }
  | { type: 'ARCHIVE_PATIENT'; id: string; arquivado: boolean }
  | { type: 'ADD_EXCEPTION'; exception: ExceptionEntry }
  | { type: 'REMOVE_EXCEPTION'; id: string }
  | { type: 'CHECK_ATTENDANCE'; patientId: string; data: string }
  | { type: 'UNCHECK_ATTENDANCE'; patientId: string; data: string }
  | { type: 'RENEW_PACKAGE'; patientId: string; data: string }
  | { type: 'ENSURE_MONTHLY_PAYMENTS'; month: string }
  | { type: 'SET_PAID'; paymentId: string; pago: boolean; data: string }
  | { type: 'SET_TEMPLATES'; templates: Settings['templates'] }
  | { type: 'IMPORT_STATE'; state: AppState }

function openCycleOf(state: AppState, patientId: string) {
  const cycles = state.cycles.filter(c => c.patientId === patientId)
  return cycles[cycles.length - 1]
}

function createCycleAndPayment(state: AppState, patient: Patient): AppState {
  const cycle = { id: newId(), patientId: patient.id, inicio: patient.dataInicio, sessoesUsadas: 0 }
  const payment = {
    id: newId(),
    patientId: patient.id,
    ciclo: cycle.id,
    data: patient.dataInicio,
    valor: patient.valor,
    pago: false,
  }
  return { ...state, cycles: [...state.cycles, cycle], payments: [...state.payments, payment] }
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PATIENT': {
      let next: AppState = { ...state, patients: [...state.patients, action.patient] }
      if (action.patient.pacote === 'dez_sessoes') {
        next = createCycleAndPayment(next, action.patient)
      }
      return next
    }

    case 'UPDATE_PATIENT': {
      let next: AppState = {
        ...state,
        patients: state.patients.map(p => (p.id === action.patient.id ? action.patient : p)),
      }
      if (action.patient.pacote === 'dez_sessoes') {
        const hasCycle = state.cycles.some(c => c.patientId === action.patient.id)
        if (!hasCycle) {
          next = createCycleAndPayment(next, action.patient)
        }
      }
      return next
    }

    case 'REMOVE_PATIENT': {
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.id),
        exceptions: state.exceptions.filter(e => e.patientId !== action.id),
        attendances: state.attendances.filter(a => a.patientId !== action.id),
        payments: state.payments.filter(pay => pay.patientId !== action.id),
        cycles: state.cycles.filter(c => c.patientId !== action.id),
      }
    }

    case 'ARCHIVE_PATIENT': {
      return {
        ...state,
        patients: state.patients.map(p => (p.id === action.id ? { ...p, arquivado: action.arquivado } : p)),
      }
    }

    case 'ADD_EXCEPTION': {
      const oposto = action.exception.tipo === 'add' ? 'skip' : 'add'
      const exceptions = state.exceptions.filter(
        e => !(e.patientId === action.exception.patientId && e.data === action.exception.data && e.tipo === oposto)
      )
      return { ...state, exceptions: [...exceptions, action.exception] }
    }

    case 'REMOVE_EXCEPTION': {
      return { ...state, exceptions: state.exceptions.filter(e => e.id !== action.id) }
    }

    case 'CHECK_ATTENDANCE': {
      const already = state.attendances.some(
        a => a.patientId === action.patientId && a.data === action.data
      )
      if (already) return state

      const patient = state.patients.find(p => p.id === action.patientId)
      if (!patient) return state

      const attendance = { id: newId(), patientId: action.patientId, data: action.data }
      let next: AppState = { ...state, attendances: [...state.attendances, attendance] }

      if (patient.pacote === 'dez_sessoes') {
        const cycle = openCycleOf(next, action.patientId)
        if (cycle) {
          next = {
            ...next,
            cycles: next.cycles.map(c => (c.id === cycle.id ? { ...c, sessoesUsadas: c.sessoesUsadas + 1 } : c)),
          }
        }
      } else if (patient.pacote === 'avulso') {
        const payment = {
          id: newId(),
          patientId: action.patientId,
          ciclo: action.data,
          data: action.data,
          valor: patient.valor,
          pago: false,
        }
        next = { ...next, payments: [...next.payments, payment] }
      }

      return next
    }

    case 'UNCHECK_ATTENDANCE': {
      const attendance = state.attendances.find(
        a => a.patientId === action.patientId && a.data === action.data
      )
      if (!attendance) return state

      const patient = state.patients.find(p => p.id === action.patientId)
      let next: AppState = {
        ...state,
        attendances: state.attendances.filter(a => a.id !== attendance.id),
      }

      if (patient?.pacote === 'dez_sessoes') {
        const cycle = openCycleOf(next, action.patientId)
        if (cycle) {
          next = {
            ...next,
            cycles: next.cycles.map(c =>
              c.id === cycle.id ? { ...c, sessoesUsadas: Math.max(0, c.sessoesUsadas - 1) } : c
            ),
          }
        }
      } else if (patient?.pacote === 'avulso') {
        next = {
          ...next,
          payments: next.payments.filter(
            pay => !(pay.patientId === action.patientId && pay.ciclo === action.data)
          ),
        }
      }

      return next
    }

    case 'RENEW_PACKAGE': {
      const patient = state.patients.find(p => p.id === action.patientId)
      if (!patient) return state
      const cycle = { id: newId(), patientId: action.patientId, inicio: action.data, sessoesUsadas: 0 }
      const payment = {
        id: newId(),
        patientId: action.patientId,
        ciclo: cycle.id,
        data: action.data,
        valor: patient.valor,
        pago: false,
      }
      return { ...state, cycles: [...state.cycles, cycle], payments: [...state.payments, payment] }
    }

    case 'ENSURE_MONTHLY_PAYMENTS': {
      const month = action.month
      const monthEnd = `${month}-31`
      const paymentData = `${month}-01`
      let next = state
      for (const patient of state.patients) {
        if (patient.pacote !== 'mensal') continue
        if (patient.arquivado) continue
        if (patient.dataInicio > monthEnd) continue
        const exists = next.payments.some(pay => pay.patientId === patient.id && pay.ciclo === month)
        if (exists) continue
        const payment = {
          id: newId(),
          patientId: patient.id,
          ciclo: month,
          data: paymentData,
          valor: patient.valor,
          pago: false,
        }
        next = { ...next, payments: [...next.payments, payment] }
      }
      return next
    }

    case 'SET_PAID': {
      return {
        ...state,
        payments: state.payments.map(pay =>
          pay.id === action.paymentId
            ? action.pago
              ? { ...pay, pago: true, dataPagamento: action.data }
              : { ...pay, pago: false, dataPagamento: undefined }
            : pay
        ),
      }
    }

    case 'SET_TEMPLATES': {
      return { ...state, settings: { ...state.settings, templates: action.templates } }
    }

    case 'IMPORT_STATE': {
      return action.state
    }

    default:
      return state
  }
}
