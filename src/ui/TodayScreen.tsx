import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { patientsForDate, isDone } from '../logic/schedule'
import { packageAlert, openCycle } from '../logic/packages'
import { fillTemplate, waLink } from '../logic/messages'
import { todayISO, formatBR, formatMoney, monthLabel, monthOf, weekdayOf, weekDates, addDays } from '../logic/dates'
import { Badge, Card, CheckCircle, Chevron, ConfirmSheet, Sheet, WaButton, useToast, withViewTransition } from './components'
import SettingsSheet from './SettingsSheet'
import PatientForm from './PatientForm'
import { newId, type Patient, type ExceptionEntry } from '../types'

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Dispatch = ReturnType<typeof useStore>['dispatch']
type State = ReturnType<typeof useStore>['state']

const iconGear = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export default function TodayScreen() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const hoje = todayISO()
  const [selected, setSelected] = useState(hoje)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addingExtra, setAddingExtra] = useState(false)
  const [sheetFor, setSheetFor] = useState<Patient | null>(null)
  const [editing, setEditing] = useState<Patient | null>(null)

  const week = weekDates(selected)
  const pacientes = patientsForDate(state, selected)
  // pendentes primeiro (já em ordem de nome), atendidos afundam pro fim
  const ordenados = [...pacientes].sort(
    (a, b) => Number(isDone(state, a.id, selected)) - Number(isDone(state, b.id, selected))
  )

  const feitos = pacientes.filter(p => isDone(state, p.id, selected)).length
  const ehHoje = selected === hoje

  // dia passado com pelo menos uma presença ainda não marcada
  const hasPending = (d: string) => {
    if (d >= hoje) return false
    const ps = patientsForDate(state, d)
    return ps.length > 0 && ps.filter(p => isDone(state, p.id, d)).length < ps.length
  }
  const semanaTemPendencia = week.some(hasPending)

  const isExtra = (patientId: string) =>
    state.exceptions.some(e => e.patientId === patientId && e.data === selected && e.tipo === 'add')

  const disponiveis = state.patients
    .filter(p => !p.arquivado && !pacientes.some(x => x.id === p.id))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const goTo = (d: string) => {
    setSelected(d)
    setAddingExtra(false)
    setSheetFor(null)
  }

  return (
    <div>
      <div className="screen-header" style={{ paddingRight: 8 }}>
        <h1 className="screen-title">Hoje</h1>
        <button type="button" className="icon-btn" aria-label="Configurações" onClick={() => setSettingsOpen(true)}>
          {iconGear}
        </button>
      </div>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {editing && (
        <PatientForm
          patient={editing}
          onSave={p => {
            dispatch({ type: 'UPDATE_PATIENT', patient: p })
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {sheetFor && (
        <DaySheet
          patient={sheetFor}
          date={selected}
          hoje={hoje}
          extra={isExtra(sheetFor.id)}
          state={state}
          dispatch={dispatch}
          onClose={() => setSheetFor(null)}
          onOpenForm={() => {
            setEditing(sheetFor)
            setSheetFor(null)
          }}
        />
      )}

      <div className="week-nav">
        <button type="button" className="week-arrow" aria-label="Semana anterior" onClick={() => goTo(addDays(selected, -7))}>
          <Chevron dir="left" />
        </button>
        <span className="week-range">
          {formatBR(week[0])} – {formatBR(week[6])}
        </span>
        <button type="button" className="week-arrow" aria-label="Próxima semana" onClick={() => goTo(addDays(selected, 7))}>
          <Chevron dir="right" />
        </button>
      </div>

      <div className="week-strip home-strip">
        {week.map((d, i) => {
          const count = patientsForDate(state, d).length
          const pendente = hasPending(d)
          const countLabel = count === 0 ? 'sem atendimentos' : count === 1 ? '1 atendimento' : `${count} atendimentos`
          return (
            <button
              key={d}
              type="button"
              className={`week-day${d === hoje ? ' is-today' : ''}${d === selected ? ' is-selected' : ''}`}
              aria-label={`${WEEKDAYS[i]}, ${formatBR(d)}, ${countLabel}`}
              aria-pressed={d === selected}
              onClick={() => goTo(d)}
            >
              <span className="week-day-letter">{LETTERS[i]}</span>
              <span className="week-day-num">{d.slice(8, 10)}</span>
              <span className="week-day-count">{count > 0 ? count : ''}</span>
              {pendente && <span className="week-day-alert" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className="row-between pad day-caption-row">
        <p className="muted day-caption">
          {ehHoje ? 'hoje' : WEEKDAYS[weekdayOf(selected)]}, {formatBR(selected)}
          {pacientes.length > 0 && ` · ${feitos}/${pacientes.length} atendidos`}
          {semanaTemPendencia && <span className="caption-alert"> · presenças pendentes</span>}
        </p>
        {!ehHoje && (
          <button type="button" className="btn-link" onClick={() => goTo(hoje)}>
            Voltar a hoje
          </button>
        )}
      </div>

      {ordenados.length === 0 ? (
        <p className="empty">{ehHoje ? 'Nenhum atendimento hoje 🌿' : 'Nenhum atendimento nesse dia 🌿'}</p>
      ) : (
        <ul className="list">
          {ordenados.map(p => (
            <li key={`${p.id}:${selected}`} style={{ viewTransitionName: `row-${p.id}` }}>
              <PatientRow
                patient={p}
                date={selected}
                hoje={hoje}
                extra={isExtra(p.id)}
                state={state}
                dispatch={dispatch}
                onOpen={() => setSheetFor(p)}
              />
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
              toast('Encaixe adicionado')
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

// regra compartilhada da linha e do sheet
function rowInfo(state: State, patient: Patient, date: string, hoje: string) {
  const done = isDone(state, patient.id, date)
  const alert = packageAlert(state, patient, hoje)
  const usadas = patient.pacote === 'dez_sessoes' ? openCycle(state, patient.id)?.sessoesUsadas ?? 0 : null
  const badgeLabel = alert === 'renovar_dez' ? 'Renovar pacote' : alert === 'renovar_mensal' ? 'Cobrar mensalidade' : null
  // pendência só vira badge quando é acionável: atraso de mês anterior, sessão avulsa
  // já feita, ou dentro da janela de renovação (fim do mês / pacote acabando)
  const mesAtual = monthOf(hoje)
  const pagamentoPendente = state.payments.some(p => {
    if (p.patientId !== patient.id || p.pago) return false
    if (monthOf(p.data) < mesAtual) return true
    if (patient.pacote === 'avulso') return true
    return alert !== null
  })
  const vars = {
    nome: patient.nome.split(' ')[0],
    valor: formatMoney(patient.valor).replace('R$ ', ''),
    mes: monthLabel(monthOf(hoje)),
  }
  const template = alert === 'renovar_dez' ? state.settings.templates.renovacaoDez : state.settings.templates.cobrancaMensal
  const href = alert ? waLink(patient.whatsapp, fillTemplate(template, vars)) : waLink(patient.whatsapp, '')
  return { done, alert, usadas, badgeLabel, pagamentoPendente, href }
}

function PatientRow({
  patient,
  date,
  hoje,
  extra,
  state,
  dispatch,
  onOpen,
}: {
  patient: Patient
  date: string
  hoje: string
  extra: boolean
  state: State
  dispatch: Dispatch
  onOpen: () => void
}) {
  const { done, usadas, badgeLabel, pagamentoPendente, href } = rowInfo(state, patient, date, hoje)
  const checkavel = date <= hoje
  const temBadge = badgeLabel !== null || pagamentoPendente || extra

  const toggle = () =>
    withViewTransition(() =>
      dispatch(
        done
          ? { type: 'UNCHECK_ATTENDANCE', patientId: patient.id, data: date }
          : { type: 'CHECK_ATTENDANCE', patientId: patient.id, data: date }
      )
    )

  return (
    <div className={`list-row${done ? ' is-done' : ''}`}>
      {checkavel ? (
        <CheckCircle checked={done} onChange={toggle} label={`Presença de ${patient.nome}`} />
      ) : (
        <span className="list-row-dot" aria-hidden="true" />
      )}
      <button type="button" className="patient-open stack" onClick={onOpen}>
        <span className="strong patient-name">{patient.nome}</span>
        <span className="muted patient-meta">
          {patient.cidade}
          {usadas !== null && ` · ${usadas}/10`}
        </span>
        {temBadge && (
          <span className="patient-badges">
            {extra && <Badge kind="accent">Extra</Badge>}
            {badgeLabel && <Badge kind="warn">{badgeLabel}</Badge>}
            {pagamentoPendente && <Badge kind="warn">Pagamento pendente</Badge>}
          </span>
        )}
      </button>
      {patient.whatsapp && <WaButton href={href} />}
    </div>
  )
}

function DaySheet({
  patient,
  date,
  hoje,
  extra,
  state,
  dispatch,
  onClose,
  onOpenForm,
}: {
  patient: Patient
  date: string
  hoje: string
  extra: boolean
  state: State
  dispatch: Dispatch
  onClose: () => void
  onOpenForm: () => void
}) {
  const toast = useToast()
  const [remarcando, setRemarcando] = useState(false)
  const [confirmandoRenova, setConfirmandoRenova] = useState(false)
  const [novaData, setNovaData] = useState(addDays(date, 7))
  const { alert, usadas, href } = rowInfo(state, patient, date, hoje)
  const primeiroNome = patient.nome.split(' ')[0]

  // Remove o card do dia atual e devolve a função de desfazer:
  // se veio de um add, remove o próprio add (desfazer recria); senão cria skip (desfazer remove).
  const desmarcarDia = (): (() => void) => {
    if (extra) {
      const ex = state.exceptions.find(e => e.patientId === patient.id && e.data === date && e.tipo === 'add')
      if (ex) {
        dispatch({ type: 'REMOVE_EXCEPTION', id: ex.id })
        return () => dispatch({ type: 'ADD_EXCEPTION', exception: ex })
      }
      return () => {}
    }
    const skip: ExceptionEntry = { id: newId(), patientId: patient.id, data: date, tipo: 'skip' }
    dispatch({ type: 'ADD_EXCEPTION', exception: skip })
    return () => dispatch({ type: 'REMOVE_EXCEPTION', id: skip.id })
  }

  const cancelar = () => {
    const desfazer = desmarcarDia()
    toast(`${primeiroNome} removido de ${formatBR(date)}`, { action: { label: 'Desfazer', onClick: desfazer } })
    onClose()
  }

  const remarcar = () => {
    if (!novaData || novaData === date) {
      onClose()
      return
    }
    const desfazerDesmarca = desmarcarDia()
    const diaNatural = patient.diasSemana.includes(weekdayOf(novaData)) && patient.dataInicio <= novaData
    const skipNaNova = state.exceptions.find(e => e.patientId === patient.id && e.data === novaData && e.tipo === 'skip')
    let addNova: ExceptionEntry | null = null
    if (!diaNatural || skipNaNova) {
      addNova = { id: newId(), patientId: patient.id, data: novaData, tipo: 'add' }
      dispatch({ type: 'ADD_EXCEPTION', exception: addNova })
    }
    toast(`${primeiroNome} remarcado para ${formatBR(novaData)}`, {
      action: {
        label: 'Desfazer',
        onClick: () => {
          desfazerDesmarca()
          if (addNova) dispatch({ type: 'REMOVE_EXCEPTION', id: addNova.id })
          if (skipNaNova) dispatch({ type: 'ADD_EXCEPTION', exception: skipNaNova })
        },
      },
    })
    onClose()
  }

  const doRenovar = () => {
    dispatch({ type: 'RENEW_PACKAGE', patientId: patient.id, data: hoje })
    toast(
      'Pacote renovado — cobrança criada',
      patient.whatsapp
        ? { action: { label: 'Cobrar no WhatsApp', onClick: () => window.open(href, '_blank', 'noopener,noreferrer') } }
        : undefined
    )
    setConfirmandoRenova(false)
    onClose()
  }

  const pacoteLabel =
    patient.pacote === 'mensal' ? 'Mensal' : patient.pacote === 'dez_sessoes' ? `Pacote 10 sessões · ${usadas ?? 0}/10` : 'Avulso'

  return (
    <>
      <Sheet title={patient.nome} onClose={onClose}>
        <div className="sheet-header">
          <span className="muted" style={{ fontSize: 13 }}>
            {pacoteLabel} · {formatMoney(patient.valor)}
            {extra && ' · extra neste dia'}
          </span>
        </div>

        {remarcando ? (
          <div className="sheet-section">
            <span className="field-label">Remarcar {formatBR(date)} para:</span>
            <input type="date" value={novaData} min={date} onChange={e => setNovaData(e.target.value)} />
            <div className="row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setRemarcando(false)}>
                Voltar
              </button>
              <button type="button" className="btn" disabled={!novaData || novaData === date} onClick={remarcar}>
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <div className="sheet-actions">
            {alert === 'renovar_dez' && (
              <button type="button" onClick={() => setConfirmandoRenova(true)}>Renovar pacote</button>
            )}
            <button type="button" onClick={() => setRemarcando(true)}>Remarcar este atendimento</button>
            <button type="button" onClick={cancelar}>
              {extra ? 'Remover atendimento extra' : 'Cancelar só neste dia'}
            </button>
            <button type="button" onClick={onOpenForm}>Ver ficha completa</button>
          </div>
        )}
      </Sheet>
      {confirmandoRenova && (
        <ConfirmSheet
          title="Renovar pacote"
          message={`Renovar o pacote de 10 sessões de ${patient.nome}? Uma nova cobrança será criada.`}
          confirmLabel="Renovar"
          onConfirm={doRenovar}
          onCancel={() => setConfirmandoRenova(false)}
        />
      )}
    </>
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
        <button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onCancel}>
          Fechar
        </button>
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
