import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { sessionsLeft } from '../logic/packages'
import { formatMoney } from '../logic/dates'
import { Card, Badge } from './components'
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

type FormState = { open: false } | { open: true; patient?: Patient }

export default function PatientsScreen() {
  const { state, dispatch } = useStore()
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState<FormState>({ open: false })
  const [arquivadosAberto, setArquivadosAberto] = useState(false)

  const termo = busca.trim().toLowerCase()
  const filtra = (p: Patient) => p.nome.toLowerCase().includes(termo)

  const ativos = state.patients.filter(p => !p.arquivado && filtra(p))
  const arquivados = state.patients.filter(p => p.arquivado && filtra(p))

  const salvar = (p: Patient) => {
    const existe = state.patients.some(x => x.id === p.id)
    dispatch(existe ? { type: 'UPDATE_PATIENT', patient: p } : { type: 'ADD_PATIENT', patient: p })
    setForm({ open: false })
  }

  const remover = (p: Patient) => {
    if (window.confirm(`Remover ${p.nome}? Isso apaga todo o histórico (presenças, cobranças e ciclos).`)) {
      dispatch({ type: 'REMOVE_PATIENT', id: p.id })
      setForm({ open: false })
    }
  }

  const arquivar = (p: Patient, arquivado: boolean) => {
    const msg = arquivado ? `Arquivar ${p.nome}?` : `Reativar ${p.nome}?`
    if (window.confirm(msg)) {
      dispatch({ type: 'ARCHIVE_PATIENT', id: p.id, arquivado })
      setForm({ open: false })
    }
  }

  if (form.open) {
    const editing = form.patient
    return (
      <>
        <PatientForm patient={editing} onSave={salvar} onCancel={() => setForm({ open: false })} />
        {editing && (
          <div className="overlay-actions">
            <button type="button" className="btn btn-ghost" onClick={() => arquivar(editing, true)}>
              Arquivar
            </button>
            <button type="button" className="btn btn-ghost btn-danger" onClick={() => remover(editing)}>
              Remover
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      <div className="row-between pad" style={{ paddingTop: 20, paddingBottom: 8 }}>
        <h1 className="screen-title" style={{ padding: 0 }}>
          Pacientes
        </h1>
        <button type="button" className="btn btn-add" onClick={() => setForm({ open: true })}>
          + Paciente
        </button>
      </div>

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
        <p className="empty">{termo ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado 🌿'}</p>
      ) : (
        <ul style={{ marginTop: 8 }}>
          {ativos.map(p => (
            <li key={p.id}>
              <PatientCard patient={p} state={state} onOpen={() => setForm({ open: true, patient: p })} />
            </li>
          ))}
        </ul>
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
            <ul>
              {arquivados.map(p => (
                <li key={p.id}>
                  <Card>
                    <div className="row-between">
                      <div className="stack">
                        <span className="strong">{p.nome}</span>
                        <span className="muted">{PACOTE_LABEL[p.pacote]}</span>
                      </div>
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => arquivar(p, false)}>
                        Reativar
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function PatientCard({
  patient,
  state,
  onOpen,
}: {
  patient: Patient
  state: ReturnType<typeof useStore>['state']
  onOpen: () => void
}) {
  const saldo = sessionsLeft(state, patient.id)
  const dias = diasLabel(patient.diasSemana)

  return (
    <Card onClick={onOpen}>
      <div className="row-between">
        <div className="stack">
          <span className="strong">{patient.nome}</span>
          <span className="muted">
            {PACOTE_LABEL[patient.pacote]} · {formatMoney(patient.valor)}
          </span>
          {dias && <span className="muted">{dias}</span>}
        </div>
        {saldo !== null && <Badge kind="accent">{saldo}/10</Badge>}
      </div>
    </Card>
  )
}
