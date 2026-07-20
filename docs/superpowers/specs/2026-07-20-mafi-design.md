# MAFI — Gestão de agenda e finanças para fisioterapeuta

**Data:** 2026-07-20 · **Status:** aprovado por Thom

Webapp mobile-first (PWA estático) para a irmã do Thom gerenciar pacientes,
agenda semanal e pagamentos, acessado pelo navegador do Android ("Adicionar à
tela inicial"). Sem backend: dados em localStorage, testado no desktop com
viewport mobile, publicado como build estático (Netlify/GitHub Pages).

## Stack

- Vite + React + TypeScript, SPA.
- Estado: store central (React context + reducer) persistido em localStorage,
  JSON com `schemaVersion` e migrations simples.
- Export/import de backup (arquivo JSON).
- PWA manifest (ícone, nome, standalone).
- Testes: Vitest apenas na lógica de negócio (agenda, pacotes, financeiro).
  UI validada manualmente pelo Thom.

## Modelo de dados

```ts
Patient {
  id, nome, nascimento, whatsapp, cidade,
  diasSemana: number[],      // 0=dom … 6=sáb
  dataInicio: string,        // ISO date, primeira consulta
  pacote: 'avulso' | 'dez_sessoes' | 'mensal',
  valor: number,             // por sessão (avulso), por pacote (dez), por mês (mensal)
  arquivado: boolean
}

Exception {                  // pontual, nunca altera a recorrência
  id, patientId, data: string,
  tipo: 'skip' | 'add'       // mudança ocasional de dia = skip + add
}

Attendance {                 // sessão realizada — o "check" da tela Hoje
  id, patientId, data: string
}

Payment {                    // uma cobrança por ciclo
  id, patientId,
  ciclo: string,             // mensal: 'YYYY-MM'; dez_sessoes: id do ciclo; avulso: data da sessão
  valor: number,
  pago: boolean,
  dataPagamento?: string
}

PackageCycle {               // ciclo de pacote de 10 sessões
  id, patientId, inicio: string, sessoesUsadas: number
}

Settings {
  templates: { renovacaoDez, cobrancaMensal, cobrancaAvulso }  // placeholders {nome} {valor} {mes}
}
```

Agenda do dia D = pacientes ativos com `D.weekday ∈ diasSemana` e
`dataInicio <= D`, menos exceções `skip`, mais exceções `add`.

## Telas (bottom nav, 4 abas)

1. **Hoje** — pacientes do dia com checkbox (marca/desmarca Attendance);
   badges: pacote acabando, pagamento pendente; atalho WhatsApp (`wa.me`).
2. **Pacientes** — lista com busca; form add/edit com todos os campos;
   editar dias da semana; arquivar/remover; saldo do pacote visível.
3. **Agenda** — semana corrente navegável; por dia, quem atende; ações
   pontuais: atendimento extra, remarcar (skip+add), cancelar (skip).
4. **Financeiro** — mês corrente: total recebido / a receber; lista por
   paciente com marcar pago; botão de mensagem de cobrança pronta via wa.me.

## Regras de negócio

- Check em Hoje cria Attendance. Pacote de 10: incrementa `sessoesUsadas` do
  ciclo aberto; **alerta quando faltar 1 sessão**; botão "renovar" fecha o
  ciclo e abre outro + cria Payment do novo pacote.
- Mensal: Payment por mês-calendário; nos **últimos 3 dias do mês** aparece a
  ação de enviar mensagem de renovação/cobrança.
- Avulso: cada Attendance gera um Payment individual.
- Mensagens: templates editáveis em Settings, abertos via
  `wa.me/<numero>?text=<template preenchido>`.

## Visual

Clean minimalista: fundo off-white, cinzas neutros, **uma** accent
(verde-água) para ações primárias e estados ativos; tipografia de sistema;
cards com cantos suaves; touch targets ≥44px.

## Fora de escopo

Backend, login, multiusuário, notificações push, relatórios além do resumo
mensal, despesas.
