import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { monthSummary } from '../logic/finance'
import { fillTemplate, waLink } from '../logic/messages'
import { monthLabel, monthOf, formatBR, formatMoney, todayISO } from '../logic/dates'
import { Card, CheckCircle, WaButton } from './components'
import type { Payment, Patient, Settings } from '../types'

type Dispatch = ReturnType<typeof useStore>['dispatch']

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`
}

export default function FinanceScreen() {
  const { state, dispatch } = useStore()
  const [month, setMonth] = useState(monthOf(todayISO()))

  // Idempotente: garante as cobranças mensais do mês visível no mount e a cada troca de mês.
  useEffect(() => {
    dispatch({ type: 'ENSURE_MONTHLY_PAYMENTS', month })
  }, [month, dispatch])

  const { recebido, aReceber, items } = monthSummary(state, month)

  return (
    <div>
      <h1 className="screen-title">Financeiro</h1>

      <div className="week-nav">
        <button type="button" className="week-arrow" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
          ‹
        </button>
        <span className="week-range">{monthLabel(month)}</span>
        <button type="button" className="week-arrow" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
          ›
        </button>
      </div>

      <div className="fin-stats">
        <div className="stat-card stat-accent">
          <span className="stat-label">Recebido</span>
          <span className="stat-value">{formatMoney(recebido)}</span>
        </div>
        <div className="stat-card stat-warn">
          <span className="stat-label">A receber</span>
          <span className="stat-value">{formatMoney(aReceber)}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="empty">Nenhuma cobrança neste mês 🌿</p>
      ) : (
        <ul style={{ marginTop: 12 }}>
          {items.map(({ payment, patient }) => (
            <li key={payment.id}>
              <PaymentRow payment={payment} patient={patient} templates={state.settings.templates} dispatch={dispatch} />
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const toggle = () => dispatch({ type: 'SET_PAID', paymentId: payment.id, pago: !payment.pago, data: todayISO() })

  const primeiroNome = patient.nome.split(' ')[0]
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
    <Card>
      <div className="row-between">
        <div className="row">
          <CheckCircle checked={payment.pago} onChange={toggle} label={`Pagamento de ${patient.nome}`} />
          <div className="stack">
            <span className="strong">{patient.nome}</span>
            <span className="muted">{chargeLabel(payment, patient)}</span>
          </div>
        </div>
        <div className="row">
          <span className="strong">{formatMoney(payment.valor)}</span>
          {!payment.pago && <WaButton href={href} />}
        </div>
      </div>
    </Card>
  )
}
