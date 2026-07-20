import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { patientsForDate } from '../logic/schedule'
import { weekDates, addDays, formatBR, todayISO } from '../logic/dates'
import { newId } from '../types'
import type { AppState, Patient } from '../types'
import { Card, Badge } from './components'

const WEEK_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Dispatch = ReturnType<typeof useStore>['dispatch']

export default function ScheduleScreen() {
  const { state, dispatch } = useStore()
  const [selected, setSelected] = useState(todayISO())
  const [addingExtra, setAddingExtra] = useState(false)

  const hoje = todayISO()
  const week = weekDates(selected)
  const pacientes = patientsForDate(state, selected)

  const isExtra = (patientId: string) =>
    state.exceptions.some(e => e.patientId === patientId && e.data === selected && e.tipo === 'add')

  const disponiveis = state.patients
    .filter(p => !p.arquivado && !pacientes.some(x => x.id === p.id))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <div>
      <div className="week-nav">
        <button type="button" className="week-arrow" aria-label="Semana anterior" onClick={() => setSelected(addDays(selected, -7))}>
          ‹
        </button>
        <span className="week-range">
          {formatBR(week[0])} – {formatBR(week[6])}
        </span>
        <button type="button" className="week-arrow" aria-label="Próxima semana" onClick={() => setSelected(addDays(selected, 7))}>
          ›
        </button>
      </div>

      <div className="week-strip">
        {week.map((d, i) => {
          const count = patientsForDate(state, d).length
          const cls = ['week-day']
          if (d === selected) cls.push('is-selected')
          if (d === hoje) cls.push('is-today')
          return (
            <button key={d} type="button" className={cls.join(' ')} onClick={() => setSelected(d)}>
              <span className="week-day-letter">{WEEK_LETTERS[i]}</span>
              <span className="week-day-num">{d.slice(8, 10)}</span>
              <span className="week-day-count">{count > 0 ? count : ''}</span>
            </button>
          )
        })}
      </div>

      {pacientes.length === 0 ? (
        <p className="empty">Nenhum atendimento neste dia 🌿</p>
      ) : (
        <ul style={{ marginTop: 12 }}>
          {pacientes.map(p => (
            <li key={p.id}>
              <ScheduleCard patient={p} date={selected} extra={isExtra(p.id)} state={state} dispatch={dispatch} />
            </li>
          ))}
        </ul>
      )}

      <div className="pad" style={{ marginTop: 12 }}>
        {addingExtra ? (
          <ExtraPicker
            pacientes={disponiveis}
            onCancel={() => setAddingExtra(false)}
            onPick={pid => {
              dispatch({ type: 'ADD_EXCEPTION', exception: { id: newId(), patientId: pid, data: selected, tipo: 'add' } })
              setAddingExtra(false)
            }}
          />
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setAddingExtra(true)}>
            + Atendimento extra
          </button>
        )}
      </div>
    </div>
  )
}

function ScheduleCard({
  patient,
  date,
  extra,
  state,
  dispatch,
}: {
  patient: Patient
  date: string
  extra: boolean
  state: AppState
  dispatch: Dispatch
}) {
  const [open, setOpen] = useState(false)
  const [remarcando, setRemarcando] = useState(false)
  const [novaData, setNovaData] = useState(addDays(date, 7))

  // Remove o card do dia atual: se veio de um add, remove o próprio add; senão cria skip.
  const desmarcarDia = () => {
    if (extra) {
      const ex = state.exceptions.find(e => e.patientId === patient.id && e.data === date && e.tipo === 'add')
      if (ex) dispatch({ type: 'REMOVE_EXCEPTION', id: ex.id })
    } else {
      dispatch({ type: 'ADD_EXCEPTION', exception: { id: newId(), patientId: patient.id, data: date, tipo: 'skip' } })
    }
  }

  const cancelar = () => {
    desmarcarDia()
    setOpen(false)
  }

  const remarcar = () => {
    if (!novaData) return
    desmarcarDia()
    dispatch({ type: 'ADD_EXCEPTION', exception: { id: newId(), patientId: patient.id, data: novaData, tipo: 'add' } })
    setRemarcando(false)
    setOpen(false)
  }

  const closeMenu = () => {
    setRemarcando(false)
    setOpen(false)
  }

  return (
    <Card>
      <div className="row-between">
        <div className="stack">
          <span className="strong">{patient.nome}</span>
          <span className="muted">{patient.cidade}</span>
        </div>
        <div className="row">
          {extra && <Badge kind="accent">Extra</Badge>}
          <button type="button" className="icon-btn" aria-label="Ações" aria-expanded={open} onClick={() => (open ? closeMenu() : setOpen(true))}>
            ⋯
          </button>
        </div>
      </div>

      {open && !remarcando && (
        <div className="card-menu">
          <button type="button" className="btn btn-ghost" onClick={cancelar}>
            Cancelar só neste dia
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setRemarcando(true)}>
            Remarcar
          </button>
        </div>
      )}

      {open && remarcando && (
        <div className="card-menu">
          <div>
            <span className="field-label">Nova data</span>
            <input type="date" value={novaData} min={date} onChange={e => setNovaData(e.target.value)} />
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => setRemarcando(false)}>
              Voltar
            </button>
            <button type="button" className="btn" disabled={!novaData} onClick={remarcar}>
              Confirmar
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function ExtraPicker({
  pacientes,
  onCancel,
  onPick,
}: {
  pacientes: Patient[]
  onCancel: () => void
  onPick: (patientId: string) => void
}) {
  const [pid, setPid] = useState('')

  if (pacientes.length === 0) {
    return (
      <Card>
        <p className="muted">Nenhum paciente disponível para adicionar.</p>
        <div className="card-menu">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Fechar
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <span className="field-label">Paciente</span>
      <select value={pid} onChange={e => setPid(e.target.value)}>
        <option value="">Selecione…</option>
        {pacientes.map(p => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn" disabled={!pid} onClick={() => onPick(pid)}>
          Adicionar
        </button>
      </div>
    </Card>
  )
}
