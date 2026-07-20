export function fillTemplate(tpl: string, vars: { nome: string; valor: string; mes: string }): string {
  return tpl.replaceAll('{nome}', vars.nome).replaceAll('{valor}', vars.valor).replaceAll('{mes}', vars.mes)
}

export function waLink(whatsapp: string, text: string): string {
  let digits = whatsapp.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits
  if (!text) return `https://wa.me/${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
