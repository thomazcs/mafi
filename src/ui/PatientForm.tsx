import { useState } from 'react'
import type { Patient, Pacote } from '../types'
import { newId } from '../types'
import { todayISO } from '../logic/dates'
import { Chevron, useEscClose } from './components'

const CHIPS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] // 0=dom … 6=sáb

const PACOTE_LABELS: Record<Pacote, string> = {
  avulso: 'Avulso',
  dez_sessoes: 'Pacote 10 sessões',
  mensal: 'Mensal',
}

const VALOR_LABELS: Record<Pacote, string> = {
  avulso: 'Valor por sessão',
  dez_sessoes: 'Valor do pacote',
  mensal: 'Valor mensal',
}

export default function PatientForm({
  patient,
  onSave,
  onCancel,
}: {
  patient?: Patient
  onSave: (p: Patient) => void
  onCancel: () => void
}) {
  const [nome, setNome] = useState(patient?.nome ?? '')
  const [nascimento, setNascimento] = useState(patient?.nascimento ?? '')
  const [whatsapp, setWhatsapp] = useState(patient?.whatsapp ?? '')
  const [cidade, setCidade] = useState(patient?.cidade ?? '')
  const [diasSemana, setDiasSemana] = useState<number[]>(patient?.diasSemana ?? [])
  const [dataInicio, setDataInicio] = useState(patient?.dataInicio ?? todayISO())
  const [pacote, setPacote] = useState<Pacote>(patient?.pacote ?? 'avulso')
  const [valor, setValor] = useState(patient ? String(patient.valor) : '')
  const [tentou, setTentou] = useState(false)

  const editando = !!patient

  useEscClose(onCancel)

  const toggleDia = (d: number) =>
    setDiasSemana(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)))

  const nomeOk = nome.trim().length > 0
  const diasOk = diasSemana.length > 0
  const valorOk = Number(valor) > 0
  const valido = nomeOk && diasOk && valorOk

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) {
      setTentou(true)
      return
    }
    const p: Patient = {
      id: patient?.id ?? newId(),
      nome: nome.trim(),
      nascimento,
      whatsapp: whatsapp.trim(),
      cidade: cidade.trim(),
      diasSemana,
      dataInicio,
      pacote,
      valor: Number(valor) || 0,
      arquivado: patient?.arquivado ?? false,
    }
    onSave(p)
  }

  return (
    <div className="overlay">
      <header className="overlay-header">
        <button type="button" className="overlay-back" onClick={onCancel} aria-label="Voltar">
          <Chevron dir="left" />
        </button>
        <h1 className="overlay-title">{editando ? 'Editar paciente' : 'Novo paciente'}</h1>
      </header>

      <form className="overlay-body" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Nome *</span>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} autoFocus aria-invalid={tentou && !nomeOk} />
          {tentou && !nomeOk && <span className="field-error">Informe o nome</span>}
        </label>

        <label className="field">
          <span className="field-label">Nascimento</span>
          <input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">WhatsApp</span>
          <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
        </label>

        <label className="field">
          <span className="field-label">Cidade</span>
          <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} />
        </label>

        <div className="field">
          <span className="field-label">Dias da semana *</span>
          <div className="day-chips" role="group" aria-label="Dias da semana">
            {CHIPS.map((c, i) => {
              const on = diasSemana.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  className={on ? 'day-chip is-on' : 'day-chip'}
                  aria-pressed={on}
                  onClick={() => toggleDia(i)}
                >
                  {c}
                </button>
              )
            })}
          </div>
          {tentou && !diasOk && <span className="field-error">Escolha pelo menos um dia</span>}
        </div>

        <label className="field">
          <span className="field-label">Data de início</span>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Pacote</span>
          <select value={pacote} onChange={e => setPacote(e.target.value as Pacote)}>
            <option value="avulso">{PACOTE_LABELS.avulso}</option>
            <option value="dez_sessoes">{PACOTE_LABELS.dez_sessoes}</option>
            <option value="mensal">{PACOTE_LABELS.mensal}</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">{VALOR_LABELS[pacote]} *</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={valor}
            onChange={e => setValor(e.target.value)}
            aria-invalid={tentou && !valorOk}
          />
          {tentou && !valorOk && <span className="field-error">Informe um valor maior que zero</span>}
        </label>

        <div className="overlay-actions">
          <button type="submit" className="btn">
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}
