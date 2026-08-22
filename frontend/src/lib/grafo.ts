import bruto from "@/data/grafo.json";

/**
 * O grafo de semelhança entre entes.
 *
 * Calculado em etapa de build por `analise/gerar-grafo.mjs` — inclusive o
 * layout. Simulação de força é cara e não determinística; rodando antes, o
 * mesmo dado sempre desenha o mesmo grafo e a página não gasta nada.
 */

export interface NoGrafo {
  nome: string;
  /** Rótulo para o desenho: sigla no estado, nome da cidade na capital. */
  curto: string;
  x: number;
  y: number;
  comunidade: number;
  pontuacao: number;
  tipo: string;
  pop: number | null;
}

export interface ArestaGrafo {
  a: string;
  b: string;
  /** Cosseno entre os vetores de déficit, 0 a 1. */
  s: number;
  interna: boolean;
}

/** Um componente que quase todos do grupo falham e um ou dois resolveram. */
export interface Ponte {
  componente: string;
  nome: string;
  falham: number;
  resolveram: string[];
}

export interface Comunidade {
  id: number;
  entes: string[];
  tamanho: number;
  /**
   * O que distingue o grupo dos outros — o componente de maior DESVIO em
   * relação à média dos grupos, não o de maior déficit absoluto. `tipo: "forte"`
   * quando o grupo não se destaca por fragilidade nenhuma.
   */
  caracter: {
    eixo: string | null;
    marca: string | null;
    componente: string | null;
    desvio: number;
    tipo: "fragil" | "forte" | "misto";
  } | null;
  /** Casco convexo afastado, para o contorno que agrupa sem gastar cor. */
  contorno: { x: number; y: number }[] | null;
  pontuacaoMedia: number;
  perfil: { c: string; nome: string; deficit: number }[];
  pontes: Ponte[];
  /** false quando o grupo é pequeno demais para sustentar generalização. */
  generalizavel: boolean;
}

export interface Grafo {
  meta: {
    metrica: string;
    vizinhos: number;
    comunidades: number;
    gerado: string;
    aviso: string;
  };
  viewBox: string;
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
  comunidades: Comunidade[];
}

export const GRAFO = bruto as unknown as Grafo;

const POR_NOME = new Map(GRAFO.nos.map((n) => [n.nome, n]));

export function noDe(nome: string): NoGrafo | undefined {
  return POR_NOME.get(nome);
}

export function comunidadeDe(nome: string): Comunidade | undefined {
  const no = POR_NOME.get(nome);
  return no ? GRAFO.comunidades[no.comunidade] : undefined;
}

/** Os vizinhos diretos de um ente, do mais parecido ao menos. */
export function vizinhosDe(nome: string): { nome: string; semelhanca: number }[] {
  return GRAFO.arestas
    .filter((e) => e.a === nome || e.b === nome)
    .map((e) => ({ nome: e.a === nome ? e.b : e.a, semelhanca: e.s }))
    .sort((x, y) => y.semelhanca - x.semelhanca);
}

/**
 * As pontes que servem a este ente: componentes que ele falha e alguém do mesmo
 * grupo resolveu.
 *
 * É a pergunta mais útil que o grafo responde — "quem tem o meu problema e já
 * resolveu?" —, e a resposta não é gerada: é o parecer que o auditor escreveu
 * sobre o ente que resolveu, que já está na base.
 */
export function pontesPara(
  nome: string,
  temLacuna: (componente: string) => boolean,
): Ponte[] {
  const grupo = comunidadeDe(nome);
  if (!grupo) return [];
  return grupo.pontes
    .filter((p) => temLacuna(p.componente) && !p.resolveram.includes(nome))
    .map((p) => ({ ...p, resolveram: p.resolveram.filter((r) => r !== nome) }))
    .filter((p) => p.resolveram.length > 0);
}

/** "Bahia, Pará e São Paulo" — vírgula em tudo menos no último. */
export function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
