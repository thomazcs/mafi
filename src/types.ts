export type Pacote = 'avulso' | 'dez_sessoes' | 'mensal'

export interface Patient {
  id: string
  nome: string
  nascimento: string   // ISO ou ''
  whatsapp: string     // dígitos, como digitado
  cidade: string
  diasSemana: number[] // 0=dom … 6=sáb
  dataInicio: string   // ISO — primeira consulta
  pacote: Pacote
  valor: number        // avulso: por sessão; dez_sessoes: pelo pacote; mensal: por mês
  arquivado: boolean
}

export interface ExceptionEntry {
  id: string
  patientId: string
  data: string         // ISO
  tipo: 'skip' | 'add'
}

export interface Attendance { id: string; patientId: string; data: string }

export interface Payment {
  id: string
  patientId: string
  ciclo: string        // mensal: 'YYYY-MM' | dez_sessoes: id do PackageCycle | avulso: data da sessão
  data: string         // ISO — data de criação da cobrança (usada pro filtro mensal)
  valor: number
  pago: boolean
  dataPagamento?: string
}

export interface PackageCycle { id: string; patientId: string; inicio: string; sessoesUsadas: number }

export interface Settings {
  templates: { renovacaoDez: string; cobrancaMensal: string; cobrancaAvulso: string }
}

export interface AppState {
  schemaVersion: 1
  patients: Patient[]
  exceptions: ExceptionEntry[]
  attendances: Attendance[]
  payments: Payment[]
  cycles: PackageCycle[]
  settings: Settings
}

export const DEFAULT_TEMPLATES: Settings['templates'] = {
  renovacaoDez: 'Oi {nome}! Seu pacote de 10 sessões está acabando. Vamos renovar? O valor é R$ {valor}. 😊',
  cobrancaMensal: 'Oi {nome}! Passando pra lembrar do pagamento do mês de {mes}, no valor de R$ {valor}. Obrigada!',
  cobrancaAvulso: 'Oi {nome}! Ficou pendente o pagamento da sessão, no valor de R$ {valor}. Obrigada!',
}

export function initialState(): AppState {
  return { schemaVersion: 1, patients: [], exceptions: [], attendances: [], payments: [], cycles: [], settings: { templates: { ...DEFAULT_TEMPLATES } } }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}
