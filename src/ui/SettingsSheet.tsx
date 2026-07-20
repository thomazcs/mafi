import { useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { exportJSON, parseImport } from '../store/persist'

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [renovacaoDez, setRenovacaoDez] = useState(state.settings.templates.renovacaoDez)
  const [cobrancaMensal, setCobrancaMensal] = useState(state.settings.templates.cobrancaMensal)
  const [cobrancaAvulso, setCobrancaAvulso] = useState(state.settings.templates.cobrancaAvulso)
  const fileRef = useRef<HTMLInputElement>(null)

  const salvar = () => {
    dispatch({ type: 'SET_TEMPLATES', templates: { renovacaoDez, cobrancaMensal, cobrancaAvulso } })
    onClose()
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reimportar o mesmo arquivo
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseImport(String(reader.result))
      if (!parsed) {
        window.alert('Arquivo inválido — não foi possível importar.')
        return
      }
      if (window.confirm('Isto substitui TODOS os dados atuais por este backup. Continuar?')) {
        dispatch({ type: 'IMPORT_STATE', state: parsed })
        onClose()
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="overlay">
      <header className="overlay-header">
        <button type="button" className="overlay-back" onClick={onClose} aria-label="Voltar">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
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
        </label>

        <label className="field">
          <span className="field-label">Cobrança mensal</span>
          <textarea value={cobrancaMensal} onChange={e => setCobrancaMensal(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Cobrança avulsa</span>
          <textarea value={cobrancaAvulso} onChange={e => setCobrancaAvulso(e.target.value)} />
        </label>

        <button type="button" className="btn" onClick={salvar}>
          Salvar mensagens
        </button>

        <p className="section-title" style={{ padding: '24px 0 4px' }}>
          Backup
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => exportJSON(state)}>
          Exportar backup
        </button>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>
          Importar backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onFile} />
      </div>
    </div>
  )
}
