import { describe, it, expect } from 'vitest'
import { todayISO, weekdayOf, monthOf, addDays, daysUntilMonthEnd, weekDates, formatBR, formatMoney, monthLabel } from './dates'

describe('dates', () => {
  it('weekdayOf: 2026-07-20 é segunda (1)', () => expect(weekdayOf('2026-07-20')).toBe(1))
  it('monthOf', () => expect(monthOf('2026-07-20')).toBe('2026-07'))
  it('addDays cruza mês', () => expect(addDays('2026-07-30', 3)).toBe('2026-08-02'))
  it('daysUntilMonthEnd: dia 29 de julho → 2', () => expect(daysUntilMonthEnd('2026-07-29')).toBe(2))
  it('weekDates devolve dom→sáb contendo a data', () => {
    const w = weekDates('2026-07-20')
    expect(w).toHaveLength(7)
    expect(w[0]).toBe('2026-07-19') // domingo
    expect(w[6]).toBe('2026-07-25')
  })
  it('formatBR', () => expect(formatBR('2026-07-05')).toBe('05/07'))
  it('formatMoney inteiro', () => expect(formatMoney(120)).toBe('R$ 120'))
  it('formatMoney decimal', () => expect(formatMoney(87.5)).toBe('R$ 87,50'))
  it('monthLabel', () => expect(monthLabel('2026-07')).toBe('julho'))
  it('todayISO tem formato ISO', () => expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/))
})
