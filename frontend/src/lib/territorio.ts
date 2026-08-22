/**
 * Ligação entre os entes avaliados e o território.
 *
 * O `id` de cada ente é o código IBGE — 2 dígitos para estado, 7 para
 * município —, e os dois primeiros dígitos de um código municipal são a UF.
 * É por aí que o mapa encontra o dado sem precisar de nenhuma tabela de nomes.
 */

import type { EnteResumo } from "@/lib/dados";

export type Regiao = "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";

export const REGIOES: Regiao[] = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

/** O primeiro dígito do código da UF é a região, na divisão oficial do IBGE. */
const REGIAO_POR_DIGITO: Record<string, Regiao> = {
  "1": "Norte",
  "2": "Nordeste",
  "3": "Sudeste",
  "4": "Sul",
  "5": "Centro-Oeste",
};

/** Código da UF a que o ente pertence, seja ele estado ou município. */
export function ufDe(id: number | null): string | null {
  if (id == null) return null;
  const texto = String(id);
  if (texto.length <= 2) return texto.padStart(2, "0");
  return texto.slice(0, 2);
}

export function regiaoDe(id: number | null): Regiao | null {
  const uf = ufDe(id);
  if (!uf) return null;
  return REGIAO_POR_DIGITO[uf[0]!] ?? null;
}

/** Sigla da UF, para rótulos curtos no mapa e nas tabelas. */
export const SIGLA_UF: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};

export type TipoEnte = "Estado" | "Município" | "Distrito Federal";

export interface FiltrosTerritorio {
  tipo?: TipoEnte | "todos";
  regiao?: Regiao | "todas";
  /** Só entes com lacuna neste componente. */
  componente?: string | null;
  /** Só entes com lacuna neste eixo. */
  eixo?: string | null;
}

/**
 * Aplica os filtros do painel a um conjunto de entes.
 *
 * Filtro de componente e de eixo significam "tem lacuna aqui", não "foi
 * avaliado aqui" — a tela existe para achar problema, e um ente sem lacuna no
 * recorte não é resposta para a pergunta que está sendo feita.
 */
export function filtrarTerritorio(
  entes: Record<string, EnteResumo>,
  filtros: FiltrosTerritorio,
): [string, EnteResumo][] {
  const { tipo = "todos", regiao = "todas", componente = null, eixo = null } = filtros;

  return Object.entries(entes).filter(([, e]) => {
    if (tipo !== "todos" && e.tipo !== tipo) return false;
    if (regiao !== "todas" && regiaoDe(e.id) !== regiao) return false;
    if (componente && !(e.comps[componente]?.l ?? 0)) return false;
    if (eixo && !(e.eixos[eixo]?.l ?? 0)) return false;
    return true;
  });
}

export interface ResumoNacional {
  entes: number;
  /**
   * Requisitos em cada degrau da escala oficial:
   * [Sem progresso, Estágio inicial, Estágio intermediário, Estágio avançado].
   *
   * É o que transforma "640 de 2.245" numa forma. O número sozinho não
   * distingue um recorte onde tudo está zerado de outro onde muita coisa já
   * começou — e essa diferença é a decisão inteira de quem produz política.
   */
  degraus: [number, number, number, number];
  /** Soma da população sob jurisdição dos entes do recorte. */
  populacao: number;
  requisitos: number;
  lacunas: number;
  /** Média das maturidades dos entes do recorte. */
  maturidade: number;
  /** Entes sem nenhuma lacuna. */
  semLacuna: number;
}

/**
 * Números do recorte atual.
 *
 * A população é somada só entre estados OU só entre municípios quando o filtro
 * de tipo está ativo; sem filtro, somar as duas coisas contaria a mesma pessoa
 * duas vezes (quem mora em Manaus também mora no Amazonas). Por isso o total
 * geral usa apenas os estados e o Distrito Federal, que particionam o país.
 */
export function resumirTerritorio(
  selecionados: [string, EnteResumo][],
  contarPopulacaoDe: "todos" | "particao" = "particao",
): ResumoNacional {
  const paraPopulacao =
    contarPopulacaoDe === "todos"
      ? selecionados
      : selecionados.filter(([, e]) => e.tipo !== "Município");

  const requisitos = selecionados.reduce((s, [, e]) => s + e.tot, 0);
  const lacunas = selecionados.reduce((s, [, e]) => s + e.lac, 0);
  const somaMat = selecionados.reduce((s, [, e]) => s + e.mat, 0);

  const degraus: [number, number, number, number] = [0, 0, 0, 0];
  for (const [, e] of selecionados) {
    for (const r of Object.values(e.comps)) {
      for (let i = 0; i < 4; i += 1) degraus[i]! += r.d[i] ?? 0;
    }
  }

  return {
    entes: selecionados.length,
    degraus,
    populacao: paraPopulacao.reduce((s, [, e]) => s + (e.pop ?? 0), 0),
    requisitos,
    lacunas,
    maturidade: selecionados.length ? Math.round((somaMat / selecionados.length) * 10) / 10 : 0,
    semLacuna: selecionados.filter(([, e]) => e.lac === 0).length,
  };
}

/**
 * População sob jurisdição de ente com lacuna em um componente.
 *
 * Conta apenas estados e o DF, que particionam o território sem sobreposição.
 * A formulação correta é "vive sob jurisdição de ente com lacuna no requisito
 * X" — nunca "está em risco": a métrica mede lacuna de governança, não risco
 * físico.
 */
export function populacaoSobLacuna(
  entes: Record<string, EnteResumo>,
  componente: string,
): number {
  return Object.values(entes)
    .filter((e) => e.tipo !== "Município" && (e.comps[componente]?.l ?? 0) > 0)
    .reduce((s, e) => s + (e.pop ?? 0), 0);
}

/** Lacunas somadas por componente, no recorte atual. */
export function lacunasPorComponente(
  selecionados: [string, EnteResumo][],
): { c: string; lacunas: number; total: number }[] {
  const mapa = new Map<string, { c: string; lacunas: number; total: number }>();

  for (const [, e] of selecionados) {
    for (const [c, r] of Object.entries(e.comps)) {
      const atual = mapa.get(c) ?? { c, lacunas: 0, total: 0 };
      atual.lacunas += r.l;
      atual.total += r.t;
      mapa.set(c, atual);
    }
  }

  return [...mapa.values()].sort((a, b) => b.lacunas - a.lacunas || a.c.localeCompare(b.c));
}

/**
 * Onde cada ente cai na régua de maturidade.
 *
 * Serve à faixa de distribuição: uma média sozinha esconde se o recorte é
 * homogêneo ou se tem dois grupos em extremos opostos — e essas duas situações
 * pedem ações completamente diferentes.
 */
export function distribuicaoDeMaturidade(
  selecionados: [string, EnteResumo][],
): { nome: string; maturidade: number }[] {
  return selecionados
    .map(([nome, e]) => ({ nome, maturidade: e.mat }))
    .sort((a, b) => a.maturidade - b.maturidade);
}

/** Os entes sem nenhuma lacuna. Três nomes valem mais que o número três. */
export function entesSemLacuna(selecionados: [string, EnteResumo][]): string[] {
  return selecionados
    .filter(([, e]) => e.lac === 0)
    .map(([nome]) => nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}
