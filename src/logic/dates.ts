// Todas as datas são strings ISO 'YYYY-MM-DD', tratadas como data local (sem TZ).
function parse(iso: string): Date { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function todayISO(): string { return toISO(new Date()) }
export function weekdayOf(iso: string): number { return parse(iso).getDay() }
export function monthOf(iso: string): string { return iso.slice(0, 7) }
export function addDays(iso: string, n: number): string { const d = parse(iso); d.setDate(d.getDate() + n); return toISO(d) }
export function daysUntilMonthEnd(iso: string): number {
  const d = parse(iso)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return last - d.getDate()
}
export function weekDates(iso: string): string[] {
  const start = addDays(iso, -weekdayOf(iso))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
export function formatBR(iso: string): string { return `${iso.slice(8, 10)}/${iso.slice(5, 7)}` }
export function formatMoney(v: number): string {
  return Number.isInteger(v) ? `R$ ${v}` : `R$ ${v.toFixed(2).replace('.', ',')}`
}
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
export function monthLabel(month: string): string { return MESES[Number(month.slice(5, 7)) - 1] }
