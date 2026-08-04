import { buscarEntidadeBase } from "./entidades-base"
import type { KpiEixoResponse, SimulacaoRequest, SimulacaoResponse, TradeOffResponse } from "./types"

/**
 * Modelo de contingência: reproduz o comportamento da regressão OLS do backend
 * ClimaUtils para que o painel siga funcionando quando a API local não responde.
 */

const ANO_INICIAL = 2027
const REALIZACAO_ANUAL = [0.34, 0.63, 0.86, 1] // curva de maturação das políticas no mandato

const COEFICIENTES = {
  financiamento: { financiamento: 0.46, governanca: 0.11, politicas: 0.05 },
  governanca: { financiamento: 0.06, governanca: 0.52, politicas: 0.08 },
  politicas: { financiamento: 0.19, governanca: 0.14, politicas: 0.41 },
}

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v))
const round1 = (v: number) => Number(v.toFixed(1))

/** Saturação: ajustes extremos entregam menos que o proporcional. */
function saturar(ajustePercentual: number) {
  const x = clamp(ajustePercentual, -100, 100) / 100
  return Math.tanh(x * 1.35) / Math.tanh(1.35)
}

function projetarEixo(base: number, efeito: number, fator: number) {
  const teto = efeito >= 0 ? 100 - base : base
  return clamp(base + teto * efeito * fator)
}

export function simularLocalmente(req: SimulacaoRequest): SimulacaoResponse {
  const entidade = buscarEntidadeBase(req.nomeEntidade, req.tipoEntidade)

  const base = {
    financiamento: entidade?.scoreFinanciamento ?? 55,
    governanca: entidade?.scoreGovernanca ?? 55,
    politicas: entidade?.scorePoliticasPublicas ?? 55,
  }

  const aj = {
    financiamento: saturar(req.ajusteFinanciamento),
    governanca: saturar(req.ajusteGovernanca),
    politicas: saturar(req.ajustePoliticas),
  }

  const efeito = {
    financiamento:
      COEFICIENTES.financiamento.financiamento * aj.financiamento +
      COEFICIENTES.financiamento.governanca * aj.governanca +
      COEFICIENTES.financiamento.politicas * aj.politicas,
    governanca:
      COEFICIENTES.governanca.financiamento * aj.financiamento +
      COEFICIENTES.governanca.governanca * aj.governanca +
      COEFICIENTES.governanca.politicas * aj.politicas,
    politicas:
      COEFICIENTES.politicas.financiamento * aj.financiamento +
      COEFICIENTES.politicas.governanca * aj.governanca +
      COEFICIENTES.politicas.politicas * aj.politicas,
  }

  // Penalidade de descasamento: dinheiro sem governança perde eficácia na execução.
  const descasamento = Math.max(0, aj.financiamento - aj.governanca) * 0.12
  efeito.politicas -= descasamento

  const eixos = ["financiamento", "governanca", "politicas"] as const

  const scoresProjetados = Object.fromEntries(
    eixos.map((k) => [k, projetarEixo(base[k], efeito[k], 1)]),
  ) as Record<(typeof eixos)[number], number>

  const scoreGeralAtual = round1((base.financiamento + base.governanca + base.politicas) / 3)
  const scoreGeralProjetado = round1(
    (scoresProjetados.financiamento + scoresProjetados.governanca + scoresProjetados.politicas) / 3,
  )
  const variacaoPercentual = round1(((scoreGeralProjetado - scoreGeralAtual) / scoreGeralAtual) * 100)

  const labelsAnos = REALIZACAO_ANUAL.map((_, i) => String(ANO_INICIAL + i))

  const serieBase = REALIZACAO_ANUAL.map(() => scoreGeralAtual)
  const serieSimulada = REALIZACAO_ANUAL.map((fator) =>
    round1(
      eixos.reduce((soma, k) => soma + projetarEixo(base[k], efeito[k], fator), 0) / eixos.length,
    ),
  )

  const kpisEixos: KpiEixoResponse[] = [
    kpi("FINANCIAMENTO", "Financiamento Climático", base.financiamento, scoresProjetados.financiamento),
    kpi("GOVERNANCA", "Governança & Transparência", base.governanca, scoresProjetados.governanca),
    kpi("POLITICAS", "Execução de Políticas", base.politicas, scoresProjetados.politicas),
  ]

  return {
    metadados: {
      entidadeSelecionada: entidade?.entityName ?? req.nomeEntidade,
      tipoEntidade: entidade?.entityType ?? req.tipoEntidade,
      dataSimulacao: new Date().toISOString(),
    },
    resumo: {
      scoreGeralAtual,
      scoreGeralProjetado,
      variacaoPercentual,
      statusGeral: statusDe(variacaoPercentual),
      mensagemDiagnostico: diagnostico(req, variacaoPercentual, scoreGeralProjetado),
    },
    kpisEixos,
    seriesTemporais: {
      labelsAnos,
      linhasGrafico: [
        { nomeLinha: "Cenário base (sem intervenção)", corLinhaHex: "#8896a0", valoresAnoAAno: serieBase },
        { nomeLinha: "Cenário simulado", corLinhaHex: "#1f5f57", valoresAnoAAno: serieSimulada },
      ],
    },
    listaTradeOffs: tradeOffs(req, descasamento),
    origemCalculo: "local",
  }
}

function kpi(chave: string, nome: string, atual: number, projetado: number): KpiEixoResponse {
  const delta = projetado - atual
  const tendencia = delta > 0.8 ? "ALTA" : delta < -0.8 ? "QUEDA" : "ESTAVEL"
  return {
    chaveEixo: chave,
    nomeExibicao: nome,
    scoreAtual: round1(atual),
    scoreProjetado: round1(projetado),
    tendencia,
    corSugestaoHex: tendencia === "ALTA" ? "#1f5f57" : tendencia === "QUEDA" ? "#a33a2b" : "#8896a0",
  }
}

function statusDe(variacao: number) {
  if (variacao >= 12) return "AVANCO_ACELERADO"
  if (variacao >= 4) return "AVANCO_MODERADO"
  if (variacao > -4) return "ESTAVEL"
  if (variacao > -12) return "RETROCESSO_MODERADO"
  return "RETROCESSO_CRITICO"
}

function diagnostico(req: SimulacaoRequest, variacao: number, projetado: number) {
  const nome = req.nomeEntidade
  if (variacao >= 12) {
    return `A combinação de ajustes coloca ${nome} em trajetória de avanço acelerado, com score projetado de ${round1(projetado)} ao fim do mandato.`
  }
  if (variacao >= 4) {
    return `${nome} avança de forma moderada. O ritmo é positivo, mas insuficiente para mudar de patamar dentro dos quatro anos.`
  }
  if (variacao > -4) {
    return `Os ajustes praticamente se anulam: ${nome} termina o mandato no mesmo patamar em que começou.`
  }
  if (variacao > -12) {
    return `O cenário indica retrocesso: ${nome} perde capacidade de resposta climática ao longo do mandato.`
  }
  return `Retrocesso crítico. Os cortes simulados desmontam a estrutura climática de ${nome} em menos de um mandato.`
}

function tradeOffs(req: SimulacaoRequest, descasamento: number): TradeOffResponse[] {
  const lista: TradeOffResponse[] = []
  const { ajusteFinanciamento: fin, ajusteGovernanca: gov, ajustePoliticas: pol } = req

  if (fin >= 15 && gov < 0) {
    lista.push({
      tipo: "RISCO",
      eixoAfetado: "GOVERNANCA",
      titulo: "Mais orçamento com menos controle",
      descricaoAmigavel:
        "Ampliar o financiamento enquanto a governança é reduzida aumenta o risco de execução mal fiscalizada. Parte do dinheiro novo não se converte em política entregue.",
    })
  }
  if (pol >= 15 && fin <= 0) {
    lista.push({
      tipo: "GARGALO",
      eixoAfetado: "FINANCIAMENTO",
      titulo: "Metas ambiciosas sem lastro orçamentário",
      descricaoAmigavel:
        "Aumentar a execução de políticas sem elevar o financiamento gera atraso de cronograma: as ações começam, mas travam no segundo ano do mandato.",
    })
  }
  if (gov >= 15) {
    lista.push({
      tipo: "GANHO",
      eixoAfetado: "FINANCIAMENTO",
      titulo: "Transparência destrava recursos externos",
      descricaoAmigavel:
        "Ganhos de governança melhoram a captação junto a fundos climáticos e cooperação internacional, puxando o eixo de financiamento para cima de forma indireta.",
    })
  }
  if (fin <= -15) {
    lista.push({
      tipo: "RISCO",
      eixoAfetado: "POLITICAS",
      titulo: "Corte orçamentário interrompe obras em curso",
      descricaoAmigavel:
        "Reduzir o financiamento paralisa projetos de adaptação já contratados. O efeito aparece com força a partir do segundo ano da projeção.",
    })
  }
  if (gov <= -20) {
    lista.push({
      tipo: "RISCO",
      eixoAfetado: "GOVERNANCA",
      titulo: "Perda de rastreabilidade dos dados",
      descricaoAmigavel:
        "Com a governança nesse nível, os indicadores deixam de ser auditáveis e a própria medição de resultado climático perde confiabilidade.",
    })
  }
  if (fin >= 20 && gov >= 20 && pol >= 20) {
    lista.push({
      tipo: "ALERTA",
      eixoAfetado: "POLITICAS",
      titulo: "Limite de capacidade institucional",
      descricaoAmigavel:
        "Elevar os três eixos ao mesmo tempo exige equipe técnica que a maioria dos entes não tem hoje. O ganho real tende a ficar abaixo do projetado no primeiro ano.",
    })
  }
  if (descasamento > 0.04 && !lista.some((t) => t.eixoAfetado === "GOVERNANCA")) {
    lista.push({
      tipo: "ALERTA",
      eixoAfetado: "POLITICAS",
      titulo: "Descasamento entre recurso e capacidade de gestão",
      descricaoAmigavel:
        "O financiamento cresce mais rápido que a governança. Isso reduz a eficiência de cada real aplicado na execução das políticas.",
    })
  }
  if (fin === 0 && gov === 0 && pol === 0) {
    lista.push({
      tipo: "NEUTRO",
      eixoAfetado: "GERAL",
      titulo: "Nenhum ajuste aplicado",
      descricaoAmigavel:
        "Este é o cenário inercial: mantidas as condições atuais, a projeção repete o desempenho já observado nos dados de base.",
    })
  }
  return lista
}
