import { describe, it, expect } from 'vitest'
import { fillTemplate, waLink } from './messages'

describe('fillTemplate', () => {
  it('substitui as 3 vars, inclusive múltiplas ocorrências', () => {
    const tpl = 'Oi {nome}! {nome}, o valor é R$ {valor} referente a {mes}.'
    const result = fillTemplate(tpl, { nome: 'João', valor: '150', mes: 'julho' })
    expect(result).toBe('Oi João! João, o valor é R$ 150 referente a julho.')
  })
})

describe('waLink', () => {
  it('formata número de 11 dígitos com prefixo 55', () => {
    expect(waLink('(31) 99999-0000', 'Oi João')).toBe('https://wa.me/5531999990000?text=Oi%20Jo%C3%A3o')
  })

  it('número já com 55 (13 dígitos) não ganha outro prefixo', () => {
    expect(waLink('5531999990000', 'Oi')).toBe('https://wa.me/5531999990000?text=Oi')
  })

  it('texto vazio: abre só o chat, sem ?text=', () => {
    expect(waLink('(31) 99999-0000', '')).toBe('https://wa.me/5531999990000')
  })
})
