import { useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { exportJSON, parseImport } from '../store/persist'
import { fillTemplate } from '../logic/messages'
import { formatBR, monthLabel, monthOf, todayISO } from '../logic/dates'
import { Chevron, ConfirmSheet, useToast } from './components'
import type { AppState } from '../types'

const LAST_BACKUP_KEY = 'mafi-last-backup'
const PREVIEW_VARS = { nome: 'Maria', valor: '150', mes: monthLabel(monthOf(todayISO())) }

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const salvos = state.settings.templates
  const [renovacaoDez, setRenovacaoDez] = useState(salvos.renovacaoDez)
  const [cobrancaMensal, setCobrancaMensal] = useState(salvos.cobrancaMensal)
  const [cobrancaAvulso, setCobrancaAvulso] = useState(salvos.cobrancaAvulso)
  const [confirmClose, setConfirmClose] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppState | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(() => localStorage.getItem(LAST_BACKUP_KEY))
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty =
    renovacaoDez !== salvos.renovacaoDez ||
    cobrancaMensal !== salvos.cobrancaMensal ||
    cobrancaAvulso !== salvos.cobrancaAvulso

  const salvar = () => {
    dispatch({ type: 'SET_TEMPLATES', templates: { renovacaoDez, cobrancaMensal, cobrancaAvulso } })
    onClose()
  }

  const voltar = () => {
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  const exportar = () => {
    exportJSON(state)
    const hoje = todayISO()
    localStorage.setItem(LAST_BACKUP_KEY, hoje)
    setLastBackup(hoje)
    toast('Backup exportado')
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reimportar o mesmo arquivo
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseImport(String(reader.result))
      if (!parsed) {
        toast('Arquivo inválido — não foi possível importar.')
        return
      }
      setPendingImport(parsed)
    }
    reader.readAsText(file)
  }

  const confirmarImport = () => {
    if (!pendingImport) return
    dispatch({ type: 'IMPORT_STATE', state: pendingImport })
    setPendingImport(null)
    toast('Backup importado')
    onClose()
  }

  return (
    <>
      <div className="overlay">
        <header className="overlay-header">
          <button type="button" className="overlay-back" onClick={voltar} aria-label="Voltar">
            <Chevron dir="left" />
          </button>
          <h1 className="overlay-title">Configurações</h1>
        </header>

        <div className="overlay-body">
          <p className="section-title" style={{ padding: '0 0 4px' }}>
            Mensagens
          </p>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Placeholders: {'{nome}'} {'{valor}'} {'{mes}'}
          </p>

          <label className="field">
            <span className="field-label">Renovação pacote 10 sessões</span>
            <textarea value={renovacaoDez} onChange={e => setRenovacaoDez(e.target.value)} />
            <span className="tpl-preview">{fillTemplate(renovacaoDez, PREVIEW_VARS)}</span>
          </label>

          <label className="field">
            <span className="field-label">Cobrança mensal</span>
            <textarea value={cobrancaMensal} onChange={e => setCobrancaMensal(e.target.value)} />
            <span className="tpl-preview">{fillTemplate(cobrancaMensal, PREVIEW_VARS)}</span>
          </label>

          <label className="field">
            <span className="field-label">Cobrança avulsa</span>
            <textarea value={cobrancaAvulso} onChange={e => setCobrancaAvulso(e.target.value)} />
            <span className="tpl-preview">{fillTemplate(cobrancaAvulso, PREVIEW_VARS)}</span>
          </label>

          <button type="button" className="btn" onClick={salvar}>
            Salvar mensagens
          </button>

          <p className="section-title" style={{ padding: '24px 0 4px' }}>
            Backup
          </p>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Último backup: {lastBackup ? formatBR(lastBackup) : 'nunca'}
          </p>
          <button type="button" className="btn btn-ghost" onClick={exportar}>
            Exportar backup
          </button>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>
            Importar backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} />
        </div>
      </div>

      {confirmClose && (
        <ConfirmSheet
          title="Descartar alterações?"
          message="Você tem alterações não salvas nas mensagens."
          confirmLabel="Descartar"
          danger
          onConfirm={onClose}
          onCancel={() => setConfirmClose(false)}
        />
      )}
      {pendingImport && (
        <ConfirmSheet
          title="Importar backup"
          message="Substituir TODOS os dados por este backup?"
          confirmLabel="Substituir"
          danger
          onConfirm={confirmarImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </>
  )
}
