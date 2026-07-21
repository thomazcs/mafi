import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { monthSummary } from '../logic/finance'
import { fillTemplate, waLink } from '../logic/messages'
import { monthLabel, monthOf, formatBR, formatMoney, todayISO } from '../logic/dates'
import { CheckCircle, Chevron, WaButton, useToast, withViewTransition } from './components'
import type { Payment, Patient, Settings } from '../types'

type Dispatch = ReturnType<typeof useStore>['dispatch']
type Filtro = 'pendentes' | 'pagos' | 'tudo'

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`
}

export default function FinanceScreen() {
  const { state, dispatch } = useStore()
  const [month, setMonth] = useState(monthOf(todayISO()))
  const [filtro, setFiltro] = useState<Filtro>('tudo')

  // Idempotente: garante as cobranças mensais do mês visível no mount e a cada troca de mês.
  useEffect(() => {
    dispatch({ type: 'ENSURE_MONTHLY_PAYMENTS', month })
  }, [month, dispatch])

  const { recebido, aReceber, items } = monthSummary(state, month)
  const ehMesAtual = month === monthOf(todayISO())

  const pendentes = items.filter(i => !i.payment.pago)
  const pagos = items.filter(i => i.payment.pago)
  const visiveis = filtro === 'pendentes' ? pendentes : filtro === 'pagos' ? pagos : items

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Financeiro</h1>
      </div>

      <div className="week-nav">
        <button type="button" className="week-arrow" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
          <Chevron dir="left" />
        </button>
        <span className="week-range">{monthLabel(month)}</span>
        <button type="button" className="week-arrow" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
          <Chevron dir="right" />
        </button>
      </div>

      {!ehMesAtual && (
        <div className="fin-back-row">
          <button type="button" className="btn-link" onClick={() => setMonth(monthOf(todayISO()))}>
            Voltar ao mês atual
          </button>
        </div>
      )}

      <div className="fin-stats">
        <div className="stat-card stat-accent">
          <span className="stat-label">Recebido</span>
          <span className="stat-value">{formatMoney(recebido)}</span>
        </div>
        <div className={aReceber > 0 ? 'stat-card stat-warn' : 'stat-card'}>
          <span className="stat-label">{aReceber > 0 ? 'A receber' : 'Tudo em dia'}</span>
          <span className="stat-value">{formatMoney(aReceber)}</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="segment" role="tablist" aria-label="Filtrar cobranças">
          <SegmentItem label={`Pendentes (${pendentes.length})`} active={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')} />
          <SegmentItem label={`Pagos (${pagos.length})`} active={filtro === 'pagos'} onClick={() => setFiltro('pagos')} />
          <SegmentItem label="Tudo" active={filtro === 'tudo'} onClick={() => setFiltro('tudo')} />
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="empty">{emptyLabel(items.length, filtro)}</p>
      ) : (
        <ul className="list">
          {visiveis.map(({ payment, patient }) => (
            <li key={payment.id} style={{ viewTransitionName: `fin-${payment.id}` }}>
              <PaymentRow payment={payment} patient={patient} templates={state.settings.templates} dispatch={dispatch} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function emptyLabel(total: number, filtro: Filtro): string {
  if (total === 0) return 'Nenhuma cobrança neste mês 🌿'
  if (filtro === 'pendentes') return 'Nenhuma cobrança pendente 🌿'
  if (filtro === 'pagos') return 'Nenhuma cobrança paga ainda 🌿'
  return 'Nenhuma cobrança neste mês 🌿'
}

function SegmentItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? 'segment-item is-active' : 'segment-item'}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function chargeLabel(payment: Payment, patient: Patient): string {
  if (patient.pacote === 'mensal') return `Mensal · ${monthLabel(payment.ciclo)}`
  if (patient.pacote === 'dez_sessoes') return 'Pacote 10 sessões'
  return `Sessão ${formatBR(payment.ciclo)}`
}

function PaymentRow({
  payment,
  patient,
  templates,
  dispatch,
}: {
  payment: Payment
  patient: Patient
  templates: Settings['templates']
  dispatch: Dispatch
}) {
  const toast = useToast()
  const primeiroNome = patient.nome.split(' ')[0]

  const setPaid = (pago: boolean) => dispatch({ type: 'SET_PAID', paymentId: payment.id, pago, data: todayISO() })

  const toggle = () => {
    const marcandoPago = !payment.pago
    withViewTransition(() => setPaid(marcandoPago))
    if (marcandoPago) {
      toast(`${formatMoney(payment.valor)} de ${primeiroNome} marcado como pago`, {
        action: { label: 'Desfazer', onClick: () => setPaid(false) },
      })
    }
  }

  const vars = {
    nome: primeiroNome,
    valor: formatMoney(payment.valor).replace('R$ ', ''),
    mes: monthLabel(monthOf(payment.data)),
  }
  const template =
    patient.pacote === 'mensal'
      ? templates.cobrancaMensal
      : patient.pacote === 'dez_sessoes'
        ? templates.renovacaoDez
        : templates.cobrancaAvulso
  const href = waLink(patient.whatsapp, fillTemplate(template, vars))

  return (
    <div className={`list-row${payment.pago ? ' is-done' : ''}`}>
      <CheckCircle checked={payment.pago} onChange={toggle} label={`Pagamento de ${patient.nome}`} />
      <div className="stack fin-info">
        <span className="strong patient-name">{patient.nome}</span>
        <span className="muted patient-meta">{chargeLabel(payment, patient)}</span>
      </div>
      <span className="fin-amount">{formatMoney(payment.valor)}</span>
      {!payment.pago && patient.whatsapp && <WaButton href={href} />}
    </div>
  )
}
