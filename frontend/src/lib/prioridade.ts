/**
 * Análise multicritério: por onde começar.
 *
 * "Quem está pior" e "por onde começar" são perguntas diferentes, e o produto
 * só sabia responder a primeira — o `rank` é a taxa de lacuna e nada mais. Boa
 * Vista é a 1ª em fragilidade com 43 de 44 requisitos, e tem 436 mil
 * habitantes; São Paulo capital tem 2 lacunas e 12,4 milhões. Ordenar por
 * fragilidade não diz onde a atuação rende mais.
 *
 * Este módulo pontua cada par (ente × componente) por soma ponderada de cinco
 * critérios normalizados. A escolha da soma ponderada — e não de um método de
 * agregação mais sofisticado — é deliberada: um órgão de controle não aceita
 * uma prioridade que não sabe explicar, e a soma ponderada é a única que se
 * decompõe linearmente. Toda pontuação devolvida traz a contribuição de cada
 * critério, para que a interface possa mostrar de onde o número veio.
 *
 * Os pesos são ESCOLHA POLÍTICA, não descoberta empírica. Estão explícitos,
 * são editáveis, e devem ser registrados na peça emitida.
 *
 * Módulo puro: nada aqui toca DOM, rede ou data do sistema.
 */

import type { MapaReferencias, ResumoEixo } from "@/lib/achados";

export type Criterio =
  | "deficit"
  | "exposicao"
  | "normativo"
  | "alavancagem"
  | "precedente";

export const CRITERIOS: { id: Criterio; nome: string; explica: string }[] = [
  {
    id: "deficit",
    nome: "Déficit",
    explica: "O quanto falta para o componente atingir maturidade plena.",
  },
  {
    id: "exposicao",
    nome: "Exposição populacional",
    explica: "Quantas pessoas vivem sob jurisdição do ente, em escala logarítmica.",
  },
  {
    id: "normativo",
    nome: "Vínculo normativo",
    explica: "Se a omissão contraria obrigação legal vinculante ou apenas diretriz programática.",
  },
  {
    id: "alavancagem",
    nome: "Alavancagem",
    explica: "Quanto do componente já saiu do zero e está a um degrau de avançar.",
  },
  {
    id: "precedente",
    nome: "Precedente",
    explica: "Se existe outro ente que resolveu o mesmo requisito, com a prática documentada.",
  },
];

export type Pesos = Record<Criterio, number>;

export type PerfilPriorizacao = "fiscalizacao" | "politica";

/**
 * Dois perfis, dois conjuntos de pesos.
 *
 * É aqui que "produção de fiscalização" e "produção de política pública"
 * deixam de ser o mesmo produto forçado na mesma tela: mesmos dados, mesmos
 * critérios, pesos diferentes — e, por isso, listas diferentes.
 */
export const PESOS: Record<PerfilPriorizacao, { nome: string; pergunta: string; pesos: Pesos }> = {
  fiscalizacao: {
    nome: "Fiscalização",
    pergunta: "Onde a omissão é acionável e atinge mais gente?",
    pesos: { normativo: 0.3, exposicao: 0.3, deficit: 0.25, alavancagem: 0.1, precedente: 0.05 },
  },
  politica: {
    nome: "Política pública",
    pergunta: "Onde se avança mais com menos?",
    pesos: { alavancagem: 0.3, precedente: 0.25, deficit: 0.2, exposicao: 0.15, normativo: 0.1 },
  },
};

/**
 * Força do vínculo normativo de cada componente, de 0 a 1.
 *
 * ⚠️ Esta tabela é a única entrada do modelo que não sai de dado observado.
 * Ela classifica as bases legais da metodologia entre obrigação vinculante
 * (a lei manda fazer), diretriz programática (a lei orienta) e ausência de
 * obrigação direta. A classificação abaixo é uma leitura de primeira ordem e
 * PRECISA de curadoria jurídica antes de sustentar qualquer peça — está aqui
 * para que o modelo funcione e para que a discussão tenha um ponto de partida
 * explícito, não para encerrá-la.
 *
 * Fontes das bases: analise/dados/referencias-legais.json.
 */
export const VINCULO_NORMATIVO: Record<string, number> = {
  // Obrigação legal direta e autoaplicável
  P5: 1.0, // Política Nacional de Proteção e Defesa Civil — Lei 12.608/2012
  G1: 0.9, // CF arts. 24, 30 e 225 · PNMC Lei 12.187/2009
  G3: 0.8, // Lei 12.608/2012 (gestão de risco) · Marco de Sendai
  F1: 0.8, // LRF · Lei 14.133/2021 · Lei de Acesso à Informação
  // Diretriz programática com respaldo legal
  P1: 0.7, // PNMC — metas de mitigação
  P2: 0.7, // Plano Nacional de Adaptação (Portaria MMA 150/2016)
  P3: 0.7,
  G2: 0.6, // estrutura de governança — PNMC, referencial TCU
  P4: 0.6,
  // Recomendação sem obrigação direta ao ente
  G4: 0.5,
  G5: 0.5,
  G6: 0.5,
  G7: 0.5,
  F2: 0.4,
  F3: 0.3, // mobilização de investimento privado — sem dever legal do ente
};

export interface EnteParaPriorizar {
  nome: string;
  tipo: string;
  pop: number | null;
  comps: Record<string, ResumoEixo & { d?: number[] }>;
}

export interface Prioridade {
  ente: string;
  tipo: string;
  componente: string;
  nomeComponente: string;
  /** Índice de prioridade de atuação, 0–1. */
  ipa: number;
  /** Valor bruto de cada critério, 0–1 — antes do peso. */
  criterios: Record<Criterio, number>;
  /** Quanto cada critério contribuiu para o IPA. Soma = ipa. */
  contribuicoes: Record<Criterio, number>;
  lacunas: number;
  total: number;
  maturidade: number;
}

/** População de referência para normalizar — a maior jurisdição da base. */
const POP_MAXIMA = 46_649_132;

/**
 * Normaliza população em escala logarítmica.
 *
 * Em escala linear São Paulo domina tudo: com 46,6 milhões contra os 436 mil de
 * Boa Vista, qualquer outro critério vira ruído. O log preserva a ordem sem
 * deixar o maior ente decidir a lista sozinho.
 */
export function normalizarPopulacao(pop: number | null): number {
  if (!pop || pop <= 0) return 0;
  return Math.min(1, Math.log10(pop) / Math.log10(POP_MAXIMA));
}

/**
 * Quanto do componente já saiu do zero.
 *
 * Um requisito em "Estágio inicial" está a um degrau de "Intermediário"; um em
 * "Sem progresso" está a três de "Avançado". Onde já há movimento, o próximo
 * degrau custa menos — e são 1.113 requisitos nessa situação no país, que o
 * produto não mostrava.
 */
export function alavancagemDe(distribuicao: number[] | undefined, total: number): number {
  if (!distribuicao || total <= 0) return 0;
  const emMovimento = (distribuicao[1] ?? 0) + (distribuicao[2] ?? 0);
  return Math.min(1, emMovimento / total);
}

/** Fração dos itens do componente que têm prática documentada em outro ente. */
export function precedenteDe(
  referencias: MapaReferencias,
  componente: string,
  excluirEnte?: string,
): number {
  const itens = Object.keys(referencias).filter((k) => k.startsWith(componente));
  if (!itens.length) return 0;
  const comPratica = itens.filter((k) =>
    (referencias[k] ?? []).some((r) => r.ente !== excluirEnte),
  );
  return comPratica.length / itens.length;
}

function arredondar(v: number, casas = 4): number {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

/**
 * Pontua um par (ente × componente).
 *
 * Componentes sem nenhuma lacuna são descartados por quem chama: não faz
 * sentido priorizar atuação onde não há o que corrigir.
 */
export function priorizarComponente(
  ente: EnteParaPriorizar,
  componente: string,
  nomeComponente: string,
  referencias: MapaReferencias,
  pesos: Pesos,
): Prioridade {
  const resumo = ente.comps[componente];
  const total = resumo?.t ?? 0;

  const criterios: Record<Criterio, number> = {
    deficit: resumo ? Math.max(0, Math.min(1, 1 - resumo.m / 100)) : 0,
    exposicao: normalizarPopulacao(ente.pop),
    normativo: VINCULO_NORMATIVO[componente] ?? 0.5,
    alavancagem: alavancagemDe(resumo?.d, total),
    precedente: precedenteDe(referencias, componente, ente.nome),
  };

  const contribuicoes = {} as Record<Criterio, number>;
  let ipa = 0;
  for (const { id } of CRITERIOS) {
    const parcela = criterios[id] * (pesos[id] ?? 0);
    contribuicoes[id] = arredondar(parcela);
    ipa += parcela;
  }

  return {
    ente: ente.nome,
    tipo: ente.tipo,
    componente,
    nomeComponente,
    ipa: arredondar(ipa),
    criterios: Object.fromEntries(
      Object.entries(criterios).map(([k, v]) => [k, arredondar(v)]),
    ) as Record<Criterio, number>,
    contribuicoes,
    lacunas: resumo?.l ?? 0,
    total,
    maturidade: resumo?.m ?? 0,
  };
}

/**
 * A lista de ação: onde atuar primeiro, e por quê.
 *
 * Devolve ordenada por IPA decrescente. Empate desempata por lacunas e depois
 * pelo código do componente, para que a ordem seja estável entre execuções —
 * um ranking que muda de posição sem o dado mudar destrói a confiança.
 */
export function listaDeAcao(
  entes: EnteParaPriorizar[],
  nomesComponentes: Record<string, string>,
  referencias: MapaReferencias,
  perfil: PerfilPriorizacao | Pesos = "fiscalizacao",
  limite = 20,
): Prioridade[] {
  const pesos = typeof perfil === "string" ? PESOS[perfil].pesos : perfil;

  const resultado: Prioridade[] = [];
  for (const ente of entes) {
    for (const [c, resumo] of Object.entries(ente.comps)) {
      // Sem lacuna não há o que priorizar.
      if (!resumo.l) continue;
      resultado.push(
        priorizarComponente(ente, c, nomesComponentes[c] ?? c, referencias, pesos),
      );
    }
  }

  resultado.sort(
    (a, b) =>
      b.ipa - a.ipa ||
      b.lacunas - a.lacunas ||
      a.ente.localeCompare(b.ente, "pt-BR") ||
      a.componente.localeCompare(b.componente),
  );

  return limite > 0 ? resultado.slice(0, limite) : resultado;
}

/** Rótulo legível dos pesos, para registrar na peça emitida. */
export function descreverPesos(pesos: Pesos): string {
  return CRITERIOS.map(({ id, nome }) => `${nome} ${(pesos[id] ?? 0).toFixed(2).replace(".", ",")}`)
    .join(" · ");
}
