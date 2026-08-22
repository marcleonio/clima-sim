/**
 * Domínio dos achados do Painel ClimaBrasil.
 *
 * Um "achado" é um requisito da metodologia oficial em que a auditoria de um
 * tribunal de contas não identificou nenhuma ação demonstrada (classificação
 * "Sem progresso"), acompanhado do parecer técnico que a justifica e da norma
 * que o sustenta.
 *
 * Este módulo é puro de propósito: nada aqui toca DOM, rede ou data do sistema,
 * para que o comportamento seja inteiramente verificável por teste.
 */

export type Severidade = "critico" | "atencao" | "maduro";

export interface Achado {
  /** Identificador do componente na metodologia oficial (ex.: "P5"). */
  c: string;
  /** Item dentro do componente (ex.: "A"). */
  i: string;
  /** Nome oficial do componente. */
  nome: string;
  /** Eixo: Governança, Políticas públicas ou Financiamento. */
  eixo: string;
  /** Base normativa do requisito, conforme a metodologia. */
  lei: string;
  /** O que a auditoria registrou. */
  txt: string;
}

export interface ResumoEixo {
  /** Total de requisitos avaliados. */
  t: number;
  /** Requisitos sem progresso. */
  l: number;
  /** Índice de maturidade 0–100 (média da escala oficial de 4 degraus). */
  m: number;
}

export interface Ente {
  tipo: string;
  id: number | null;
  pop: number | null;
  tot: number;
  lac: number;
  /** Maturidade geral do ente, 0–100. */
  mat: number;
  rank: number;
  eixos: Record<string, ResumoEixo>;
  comps: Record<string, ResumoEixo>;
  achados: Achado[];
}

export interface MediaNacional {
  /** Maturidade média nacional. */
  m: number;
  /** Percentual médio de lacunas. */
  l: number;
}

export interface BaseDados {
  meta: {
    snapshot: string;
    versao: string;
    total: number;
    componentes: Record<string, string>;
    nacional: {
      mat: number;
      eixos: Record<string, MediaNacional>;
      comps: Record<string, MediaNacional>;
    };
  };
  entes: Record<string, Ente>;
}

export interface Protocolo {
  numero: string;
  sha: string;
}

/**
 * Componentes cuja ausência tem consequência direta sobre vidas em evento
 * extremo: P5 (defesa civil, contingência e alerta) e P2 (estratégia de
 * adaptação baseada em risco). Sobem ao topo de qualquer listagem.
 */
export const COMPONENTES_CRITICOS = ["P5", "P2"] as const;

const LIMITE_CRITICO = 45;
const LIMITE_ATENCAO = 20;

export function taxaLacuna(ente: Pick<Ente, "lac" | "tot">): number {
  if (!ente.tot) return 0;
  return (ente.lac / ente.tot) * 100;
}

export function severidade(taxa: number): Severidade {
  if (taxa >= LIMITE_CRITICO) return "critico";
  if (taxa >= LIMITE_ATENCAO) return "atencao";
  return "maduro";
}

/** Minúsculas sem acento, para que "sao paulo" encontre "São Paulo". */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function filtrarEntes(nomes: string[], consulta: string): string[] {
  const alvo = normalizarTexto(consulta);
  if (!alvo) return [];

  return nomes
    .filter((nome) => normalizarTexto(nome).includes(alvo))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function codigoAchado(achado: Pick<Achado, "c" | "i">): string {
  return `${achado.c}${achado.i}`;
}

function prioridade(achado: Pick<Achado, "c">): number {
  const posicao = (COMPONENTES_CRITICOS as readonly string[]).indexOf(achado.c);
  return posicao === -1 ? COMPONENTES_CRITICOS.length : posicao;
}

/** Ordena sem mutar: críticos à vida primeiro, depois por código. */
export function ordenarPorPrioridade<T extends Pick<Achado, "c" | "i">>(achados: T[]): T[] {
  return [...achados].sort((a, b) => {
    const delta = prioridade(a) - prioridade(b);
    if (delta !== 0) return delta;
    return codigoAchado(a).localeCompare(codigoAchado(b));
  });
}

/**
 * djb2 — hash curto e estável. Não é criptográfico: serve para conferência
 * ("este documento veio deste conjunto de achados"), não para segurança.
 */
export function hashDeterministico(valor: string): string {
  let h = 5381;
  for (let i = 0; i < valor.length; i += 1) {
    h = ((h << 5) + h + valor.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function protocoloDe(semente: string, ano = 2026): Protocolo {
  const sha = hashDeterministico(semente);
  const numero = (parseInt(sha.slice(0, 4), 16) % 9000) + 1000;
  return { numero: `${numero}/${ano}`, sha };
}

// ---------------------------------------------------------------- colisão

export interface DiagnosticoColisao {
  /** Lacunas em requisitos com consequência direta sobre vidas. */
  criticos: Achado[];
  /** População do ente quando há colisão; 0 quando não há; null se desconhecida. */
  pessoasExpostas: number | null;
  temColisao: boolean;
}

/**
 * Onde a fragilidade institucional encontra o risco de vida.
 *
 * Não é modelo de risco físico: mede a coincidência entre a população sob
 * jurisdição do ente e a ausência dos requisitos que existem justamente para
 * proteger essa população em evento extremo (defesa civil e adaptação).
 */
export function diagnosticoColisao(ente: Pick<Ente, "achados" | "pop">): DiagnosticoColisao {
  const criticos = ordenarPorPrioridade(
    ente.achados.filter((a) => (COMPONENTES_CRITICOS as readonly string[]).includes(a.c)),
  );
  const temColisao = criticos.length > 0;

  return {
    criticos,
    temColisao,
    pessoasExpostas: temColisao ? ente.pop : 0,
  };
}

// ---------------------------------------------------------------- referências

export interface Referencia {
  ente: string;
  tipo: string;
  /** O que a auditoria registrou sobre quem atingiu "Estágio avançado". */
  txt: string;
}

export type MapaReferencias = Record<string, Referencia[]>;

/**
 * Quem já resolveu este mesmo requisito — e, segundo o parecer da auditoria,
 * o que fez para isso. A recomendação não é gerada: é a prática documentada
 * de um ente que foi avaliado como "Estágio avançado" no mesmo item.
 */
export function referenciaPara(
  mapa: MapaReferencias,
  achado: Pick<Achado, "c" | "i">,
  excluir?: string,
): Referencia[] {
  const lista = mapa[codigoAchado(achado)] ?? [];
  return excluir ? lista.filter((r) => r.ente !== excluir) : lista;
}

// ---------------------------------------------------------------- agrupamento

export interface GrupoComponente {
  c: string;
  nome: string;
  eixo: string;
  lei: string;
  itens: Achado[];
}

/**
 * Colapsa a lista de achados por componente.
 *
 * Um ente frágil chega a 43 achados — uma lista plana desse tamanho não é
 * legível. Agrupados, viram ~15 blocos com o nome do requisito e quantos
 * itens falharam dentro dele.
 */
export function agruparPorComponente(achados: Achado[]): GrupoComponente[] {
  const mapa = new Map<string, GrupoComponente>();

  for (const a of ordenarPorPrioridade(achados)) {
    const grupo = mapa.get(a.c);
    if (grupo) {
      grupo.itens.push(a);
    } else {
      mapa.set(a.c, { c: a.c, nome: a.nome, eixo: a.eixo, lei: a.lei, itens: [a] });
    }
  }

  return [...mapa.values()];
}

// ---------------------------------------------------------------- mapa de calor

export interface CelulaComponente {
  c: string;
  nome: string;
  /** Maturidade do ente neste componente, 0–100. */
  maturidade: number;
  /** Diferença em pontos para a média nacional. Positivo = acima. */
  delta: number;
  lacunas: number;
  total: number;
}

/**
 * Uma célula por componente, ordenada do pior para o melhor — o olho precisa
 * cair primeiro no que está errado, não navegar a grade inteira.
 */
export function mapaComponentes(
  ente: { comps: Record<string, ResumoEixo> },
  nomes: Record<string, string>,
  nacional: Record<string, MediaNacional>,
): CelulaComponente[] {
  return Object.entries(ente.comps)
    .map(([c, r]) => ({
      c,
      nome: nomes[c] ?? c,
      maturidade: r.m,
      delta: Math.round((r.m - (nacional[c]?.m ?? 0)) * 10) / 10,
      lacunas: r.l,
      total: r.t,
    }))
    .sort((a, b) => a.maturidade - b.maturidade || a.c.localeCompare(b.c));
}

// ---------------------------------------------------------------- formatação

export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas).replace(".", ",")}%`;
}

export function formatarNumero(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR");
}

export const ROTULO_SEVERIDADE: Record<Severidade, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  maduro: "Maduro",
};
