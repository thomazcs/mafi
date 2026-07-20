import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { patientsForDate, isDone } from '../logic/schedule'
import { packageAlert, openCycle } from '../logic/packages'
import { fillTemplate, waLink } from '../logic/messages'
import { todayISO, formatBR, formatMoney, monthLabel, monthOf, weekdayOf, weekDates } from '../logic/dates'
import { Card, Badge, CheckCircle, WaButton } from './components'
import SettingsSheet from './SettingsSheet'
import { ExtraPicker } from './ScheduleScreen'
import { newId, type Patient } from '../types'

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const iconGear = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export default function TodayScreen() {
  const { state, dispatch } = useStore()
  const hoje = todayISO()
  const [selected, setSelected] = useState(hoje)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addingExtra, setAddingExtra] = useState(false)

  const week = weekDates(hoje)
  const pacientes = patientsForDate(state, selected)
  // pendentes primeiro (já em ordem de nome), atendidos afundam pro fim
  const ordenados = [...pacientes].sort(
    (a, b) => Number(isDone(state, a.id, selected)) - Number(isDone(state, b.id, selected))
  )

  const feitos = pacientes.filter(p => isDone(state, p.id, selected)).length
  const ehHoje = selected === hoje

  const disponiveis = state.patients
    .filter(p => !p.arquivado && !pacientes.some(x => x.id === p.id))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <div>
      <div className="screen-header" style={{ paddingRight: 8 }}>
        <h1 className="screen-title">Hoje</h1>
        <button type="button" className="icon-btn" aria-label="Configurações" onClick={() => setSettingsOpen(true)}>
          {iconGear}
        </button>
      </div>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      <div className="week-strip home-strip">
        {week.map((d, i) => {
          const count = patientsForDate(state, d).length
          return (
            <button
              key={d}
              type="button"
              className={`week-day${d === hoje ? ' is-today' : ''}${d === selected ? ' is-selected' : ''}`}
              aria-label={`${WEEKDAYS[i]}, ${formatBR(d)}`}
              aria-pressed={d === selected}
              onClick={() => {
                setSelected(d)
                setAddingExtra(false)
              }}
            >
              <span className="week-day-letter">{LETTERS[i]}</span>
              <span className="week-day-num">{d.slice(8, 10)}</span>
              <span className="week-day-count">{count > 0 ? count : ''}</span>
            </button>
          )
        })}
      </div>

      <p className="pad muted day-caption">
        {ehHoje ? 'hoje' : WEEKDAYS[weekdayOf(selected)]}, {formatBR(selected)}
        {pacientes.length > 0 && ` · ${feitos}/${pacientes.length} atendidos`}
      </p>

      {ordenados.length === 0 ? (
        <p className="empty">{ehHoje ? 'Nenhum atendimento hoje 🌿' : 'Nenhum atendimento nesse dia 🌿'}</p>
      ) : (
        <ul>
          {ordenados.map(p => (
            <li key={p.id}>
              <PatientRow patient={p} date={selected} hoje={hoje} state={state} dispatch={dispatch} />
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

function PatientRow({
  patient,
  date,
  hoje,
  state,
  dispatch,
}: {
  patient: Patient
  date: string
  hoje: string
  state: ReturnType<typeof useStore>['state']
  dispatch: ReturnType<typeof useStore>['dispatch']
}) {
  const done = isDone(state, patient.id, date)
  const alert = packageAlert(state, patient, hoje)
  const checkavel = date <= hoje

  const toggle = () =>
    dispatch(
      done
        ? { type: 'UNCHECK_ATTENDANCE', patientId: patient.id, data: date }
        : { type: 'CHECK_ATTENDANCE', patientId: patient.id, data: date }
    )

  const usadas = patient.pacote === 'dez_sessoes' ? openCycle(state, patient.id)?.sessoesUsadas ?? 0 : null

  const badgeLabel = alert === 'renovar_dez' ? 'Renovar pacote' : alert === 'renovar_mensal' ? 'Fim do mês' : null
  const pagamentoPendente = state.payments.some(p => p.patientId === patient.id && !p.pago)
  const temBadge = badgeLabel !== null || pagamentoPendente

  const primeiroNome = patient.nome.split(' ')[0]
  const vars = {
    nome: primeiroNome,
    valor: formatMoney(patient.valor).replace('R$ ', ''),
    mes: monthLabel(monthOf(hoje)),
  }
  const template = alert === 'renovar_dez' ? state.settings.templates.renovacaoDez : state.settings.templates.cobrancaMensal
  const href = alert ? waLink(patient.whatsapp, fillTemplate(template, vars)) : waLink(patient.whatsapp, '')

  const podeRenovar = alert === 'renovar_dez'

  const renovar = () => {
    if (window.confirm(`Renovar o pacote de 10 sessões de ${patient.nome}?`)) {
      dispatch({ type: 'RENEW_PACKAGE', patientId: patient.id, data: hoje })
    }
  }

  return (
    <Card>
      <div className={`patient-row${done ? ' is-done' : ''}`}>
        {checkavel && <CheckCircle checked={done} onChange={toggle} label={`Presença de ${patient.nome}`} />}
        <div className="stack patient-info">
          <span className="strong patient-name">{patient.nome}</span>
          <span className="muted patient-meta">
            {patient.cidade}
            {usadas !== null && ` · ${usadas}/10 sessões`}
          </span>
          {temBadge && (
            <span className="patient-badges">
              {badgeLabel && <Badge kind="warn">{badgeLabel}</Badge>}
              {pagamentoPendente && <Badge kind="warn">Pagamento pendente</Badge>}
            </span>
          )}
        </div>
        {patient.whatsapp && <WaButton href={href} />}
      </div>

      {podeRenovar && (
        <div className="card-actions">
          <button type="button" className="btn btn-ghost" onClick={renovar}>
            Renovar
          </button>
        </div>
      )}
    </Card>
  )
}
