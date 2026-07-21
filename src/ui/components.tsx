import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type Tab = 'hoje' | 'pacientes' | 'financeiro'

export function Card({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const clickable = typeof onClick === 'function'
  return (
    <div
      className={clickable ? 'card card-clickable' : 'card'}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? e => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

export function Badge({ kind, children }: { kind: 'warn' | 'accent'; children: ReactNode }) {
  return <span className={`badge badge-${kind}`}>{children}</span>
}

export function Chevron({ dir }: { dir: 'left' | 'right' | 'down' }) {
  const d = dir === 'left' ? 'M15 18l-6-6 6-6' : dir === 'right' ? 'M9 18l6-6-6-6' : 'M6 9l6 6 6-6'
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export function CheckCircle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      className={checked ? 'check-circle is-checked' : 'check-circle'}
      aria-pressed={checked}
      aria-label={label ?? (checked ? 'Desmarcar presença' : 'Marcar presença')}
      onClick={e => {
        e.stopPropagation()
        onChange()
      }}
    >
      {checked && (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M5 12.5l4 4 10-10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

export function WaButton({ href }: { href: string }) {
  return (
    <a
      className="wa-button"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir no WhatsApp"
      onClick={e => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.42 5.82c0 4.54-3.7 8.24-8.25 8.24-1.5 0-2.97-.4-4.26-1.17l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24zm-2.7 4.42c-.14 0-.36.05-.55.26-.19.2-.72.7-.72 1.71s.74 1.98.84 2.12c.1.14 1.44 2.2 3.5 3.08 1.71.74 2.06.6 2.43.56.37-.03 1.2-.49 1.36-.96.17-.47.17-.87.12-.96-.05-.08-.19-.14-.4-.24-.21-.11-1.2-.59-1.39-.66-.19-.07-.32-.1-.46.1-.13.21-.53.66-.65.8-.12.14-.24.15-.44.05-.21-.1-.88-.32-1.68-1.03-.62-.55-1.04-1.24-1.16-1.44-.12-.21-.01-.32.09-.42.09-.09.21-.24.31-.36.1-.12.14-.21.21-.35.07-.14.03-.26-.02-.36-.05-.1-.46-1.1-.63-1.51-.16-.4-.33-.34-.46-.35h-.39z" />
      </svg>
    </a>
  )
}

/* ---------- pilha de diálogos (Esc fecha só o do topo) ---------- */
const dialogStack: symbol[] = []

export function useEscClose(onClose: () => void) {
  const idRef = useRef<symbol | undefined>(undefined)
  if (idRef.current === undefined) idRef.current = Symbol('dialog')

  useEffect(() => {
    const id = idRef.current!
    dialogStack.push(id)
    return () => {
      const i = dialogStack.indexOf(id)
      if (i !== -1) dialogStack.splice(i, 1)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (dialogStack[dialogStack.length - 1] !== idRef.current) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

/* ---------- bottom sheet genérico ---------- */
export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEscClose(onClose)

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
        <button type="button" className="icon-btn sheet-close" aria-label="Fechar" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="sheet-handle" aria-hidden="true" />
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </>
  )
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="sheet-message">{message}</p>
      <div className="row sheet-confirm-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className={danger ? 'btn btn-danger' : 'btn'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------- toast ---------- */
interface ToastAction {
  label: string
  onClick: () => void
}
interface ToastOptions {
  action?: ToastAction
}
type ToastFn = (message: string, opts?: ToastOptions) => void

const ToastContext = createContext<ToastFn | null>(null)

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa de <ToastProvider>')
  return ctx
}

interface ToastState {
  id: number
  message: string
  action?: ToastAction
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const clear = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
  }

  const show = useCallback<ToastFn>((message, opts) => {
    clear()
    setToast({ id: Date.now(), message, action: opts?.action })
    timer.current = window.setTimeout(() => setToast(null), opts?.action ? 6000 : 4500)
  }, [])

  useEffect(() => () => clear(), [])

  const dismiss = () => {
    clear()
    setToast(null)
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast-host" role="status" aria-live="polite">
          <div key={toast.id} className={toast.action ? 'toast has-action' : 'toast'}>
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action?.onClick()
                  dismiss()
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

/* ---------- view transitions (com fallback) ---------- */
export function withViewTransition(fn: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(fn)
  } else {
    fn()
  }
}

interface TabDef {
  id: Tab
  label: string
  icon: ReactNode
}

const iconSun = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
)

const iconPeople = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const iconMoney = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const TABS: TabDef[] = [
  { id: 'hoje', label: 'Hoje', icon: iconSun },
  { id: 'pacientes', label: 'Pacientes', icon: iconPeople },
  { id: 'financeiro', label: 'Financeiro', icon: iconMoney },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {TABS.map(t => (
        <button
          key={t.id}
          type="button"
          className={t.id === tab ? 'tab is-active' : 'tab'}
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
