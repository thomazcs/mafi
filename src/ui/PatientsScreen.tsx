import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { openCycle } from '../logic/packages'
import { formatMoney } from '../logic/dates'
import { waLink } from '../logic/messages'
import { Badge, ConfirmSheet, Sheet, useToast } from './components'
import PatientForm from './PatientForm'
import type { Patient } from '../types'

const DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PACOTE_LABEL: Record<Patient['pacote'], string> = {
  avulso: 'Avulso',
  dez_sessoes: 'Pacote 10 sessões',
  mensal: 'Mensal',
}

function diasLabel(dias: number[]): string {
  return dias
    .slice()
    .sort((a, b) => a - b)
    .map(d => DIA_CURTO[d])
    .join(' · ')
}

type State = ReturnType<typeof useStore>['state']
type FormState = { open: false } | { open: true; patient?: Patient }

export default function PatientsScreen() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState<FormState>({ open: false })
  const [arquivadosAberto, setArquivadosAberto] = useState(false)
  const [sheetFor, setSheetFor] = useState<Patient | null>(null)

  const termo = busca.trim().toLowerCase()
  const filtra = (p: Patient) => p.nome.toLowerCase().includes(termo)

  const ativos = state.patients.filter(p => !p.arquivado && filtra(p))
  const arquivados = state.patients.filter(p => p.arquivado && filtra(p))

  const salvar = (p: Patient) => {
    const existe = state.patients.some(x => x.id === p.id)
    dispatch(existe ? { type: 'UPDATE_PATIENT', patient: p } : { type: 'ADD_PATIENT', patient: p })
    setForm({ open: false })
  }

  const arquivar = (p: Patient) => {
    dispatch({ type: 'ARCHIVE_PATIENT', id: p.id, arquivado: true })
    toast(`${p.nome} arquivada`, {
      action: { label: 'Desfazer', onClick: () => dispatch({ type: 'ARCHIVE_PATIENT', id: p.id, arquivado: false }) },
    })
    setSheetFor(null)
  }

  const reativar = (p: Patient) => {
    dispatch({ type: 'ARCHIVE_PATIENT', id: p.id, arquivado: false })
    toast(`${p.nome} reativada`)
    setSheetFor(null)
  }

  const remover = (p: Patient) => {
    dispatch({ type: 'REMOVE_PATIENT', id: p.id })
    toast('Paciente removido')
    setSheetFor(null)
  }

  if (form.open) {
    return <PatientForm patient={form.patient} onSave={salvar} onCancel={() => setForm({ open: false })} />
  }

  return (
    <div>
      <div className="screen-header" style={{ paddingRight: 16 }}>
        <h1 className="screen-title">Pacientes</h1>
        <button type="button" className="btn btn-add" style={{ marginBottom: 4 }} onClick={() => setForm({ open: true })}>
          + Paciente
        </button>
      </div>

      {sheetFor && (
        <PatientSheet
          patient={sheetFor}
          state={state}
          onClose={() => setSheetFor(null)}
          onEdit={() => {
            setForm({ open: true, patient: sheetFor })
            setSheetFor(null)
          }}
          onArchive={() => arquivar(sheetFor)}
          onReactivate={() => reativar(sheetFor)}
          onRemove={() => remover(sheetFor)}
        />
      )}

      <div className="pad" style={{ marginBottom: 4 }}>
        <input
          type="search"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar paciente"
        />
      </div>

      {ativos.length === 0 ? (
        <p className="empty">{termo ? 'Nenhum paciente encontrado 🌿' : 'Nenhum paciente cadastrado 🌿'}</p>
      ) : (
        <>
          <div className="section-title">Ativos</div>
          <ul className="list">
            {ativos.map(p => (
              <li key={p.id}>
                <PatientRow patient={p} state={state} onOpen={() => setSheetFor(p)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {arquivados.length > 0 && (
        <>
          <button
            type="button"
            className="section-toggle"
            aria-expanded={arquivadosAberto}
            onClick={() => setArquivadosAberto(v => !v)}
          >
            Arquivados ({arquivados.length})
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: arquivadosAberto ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {arquivadosAberto && (
            <ul className="list">
              {arquivados.map(p => (
                <li key={p.id}>
                  <PatientRow patient={p} state={state} onOpen={() => setSheetFor(p)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function PatientRow({ patient, state, onOpen }: { patient: Patient; state: State; onOpen: () => void }) {
  const usadas = patient.pacote === 'dez_sessoes' ? openCycle(state, patient.id)?.sessoesUsadas ?? 0 : null
  const dias = diasLabel(patient.diasSemana)

  return (
    <div className="list-row">
      <button type="button" className="patient-open stack" onClick={onOpen}>
        <span className="strong patient-name">{patient.nome}</span>
        <span className="muted patient-meta">
          {PACOTE_LABEL[patient.pacote]} · {formatMoney(patient.valor)}
        </span>
        {dias && <span className="muted patient-meta">{dias}</span>}
      </button>
      {usadas !== null && <Badge kind="accent">{usadas}/10</Badge>}
    </div>
  )
}

function PatientSheet({
  patient,
  state,
  onClose,
  onEdit,
  onArchive,
  onReactivate,
  onRemove,
}: {
  patient: Patient
  state: State
  onClose: () => void
  onEdit: () => void
  onArchive: () => void
  onReactivate: () => void
  onRemove: () => void
}) {
  const [confirming, setConfirming] = useState<null | 'arquivar' | 'remover'>(null)
  const usadas = patient.pacote === 'dez_sessoes' ? openCycle(state, patient.id)?.sessoesUsadas ?? 0 : null
  const pacoteLabel =
    patient.pacote === 'mensal'
      ? 'Mensal'
      : patient.pacote === 'dez_sessoes'
        ? `Pacote 10 sessões · ${usadas ?? 0}/10 usadas`
        : 'Avulso'

  const abrirWhats = () => {
    window.open(waLink(patient.whatsapp, ''), '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <>
      <Sheet title={patient.nome} onClose={onClose}>
        <div className="sheet-header">
          <span className="muted" style={{ fontSize: 13 }}>
            {pacoteLabel} · {formatMoney(patient.valor)}
          </span>
        </div>
        <div className="sheet-actions">
          <button type="button" onClick={onEdit}>
            Editar ficha
          </button>
          {patient.whatsapp && (
            <button type="button" onClick={abrirWhats}>
              Mensagem no WhatsApp
            </button>
          )}
          {patient.arquivado ? (
            <button type="button" onClick={onReactivate}>
              Reativar
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming('arquivar')}>
              Arquivar
            </button>
          )}
          <button type="button" className="sheet-action-danger" onClick={() => setConfirming('remover')}>
            Remover
          </button>
        </div>
      </Sheet>
      {confirming === 'arquivar' && (
        <ConfirmSheet
          title="Arquivar"
          message={`Arquivar ${patient.nome}? Ela sai da agenda até ser reativada.`}
          confirmLabel="Arquivar"
          onConfirm={onArchive}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'remover' && (
        <ConfirmSheet
          title="Remover"
          message={`Remover ${patient.nome}? Isso apaga todo o histórico de atendimentos, pagamentos e pacotes.`}
          confirmLabel="Remover"
          danger
          onConfirm={onRemove}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}
