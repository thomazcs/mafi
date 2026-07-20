import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { patientsForDate, isDone } from '../logic/schedule'
import { packageAlert, openCycle } from '../logic/packages'
import { fillTemplate, waLink } from '../logic/messages'
import { todayISO, formatBR, formatMoney, monthLabel, monthOf, weekdayOf } from '../logic/dates'
import { Card, Badge, CheckCircle, WaButton } from './components'
import SettingsSheet from './SettingsSheet'
import type { Patient } from '../types'

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const iconGear = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export default function TodayScreen() {
  const { state, dispatch } = useStore()
  const hoje = todayISO()
  const pacientes = patientsForDate(state, hoje)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div>
      <div className="row-between" style={{ paddingRight: 8 }}>
        <h1 className="screen-title">Hoje</h1>
        <button type="button" className="icon-btn" aria-label="Configurações" onClick={() => setSettingsOpen(true)}>
          {iconGear}
        </button>
      </div>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      <p className="pad muted">
        {WEEKDAYS[weekdayOf(hoje)]}, {formatBR(hoje)}
      </p>

      {pacientes.length === 0 ? (
        <p className="empty">Nenhum atendimento hoje 🌿</p>
      ) : (
        <ul style={{ marginTop: 12 }}>
          {pacientes.map(p => (
            <li key={p.id}>
              <PatientRow patient={p} hoje={hoje} state={state} dispatch={dispatch} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PatientRow({
  patient,
  hoje,
  state,
  dispatch,
}: {
  patient: Patient
  hoje: string
  state: ReturnType<typeof useStore>['state']
  dispatch: ReturnType<typeof useStore>['dispatch']
}) {
  const done = isDone(state, patient.id, hoje)
  const alert = packageAlert(state, patient, hoje)

  const toggle = () =>
    dispatch(
      done
        ? { type: 'UNCHECK_ATTENDANCE', patientId: patient.id, data: hoje }
        : { type: 'CHECK_ATTENDANCE', patientId: patient.id, data: hoje }
    )

  const usadas = patient.pacote === 'dez_sessoes' ? openCycle(state, patient.id)?.sessoesUsadas ?? 0 : null

  const badgeLabel = alert === 'renovar_dez' ? 'Renovar pacote' : alert === 'renovar_mensal' ? 'Fim do mês' : null

  const primeiroNome = patient.nome.split(' ')[0]
  const vars = {
    nome: primeiroNome,
    valor: formatMoney(patient.valor).replace('R$ ', ''),
    mes: monthLabel(monthOf(hoje)),
  }
  const template = alert === 'renovar_dez' ? state.settings.templates.renovacaoDez : state.settings.templates.cobrancaMensal
  const href = alert ? waLink(patient.whatsapp, fillTemplate(template, vars)) : ''

  const podeRenovar = alert === 'renovar_dez'

  const renovar = () => {
    if (window.confirm(`Renovar o pacote de 10 sessões de ${patient.nome}?`)) {
      dispatch({ type: 'RENEW_PACKAGE', patientId: patient.id, data: hoje })
    }
  }

  return (
    <Card>
      <div className="row-between">
        <div className="row">
          <CheckCircle checked={done} onChange={toggle} label={`Presença de ${patient.nome}`} />
          <div className="stack">
            <span className="strong">{patient.nome}</span>
            <span className="muted">
              {patient.cidade}
              {usadas !== null && ` · ${usadas}/10 sessões`}
            </span>
          </div>
        </div>
        {badgeLabel && <Badge kind="warn">{badgeLabel}</Badge>}
      </div>

      {alert && (
        <div className="card-actions">
          <WaButton href={href} />
          {podeRenovar && (
            <button type="button" className="btn btn-ghost" onClick={renovar}>
              Renovar
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
