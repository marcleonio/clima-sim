/**
 * Acesso aos dados do Painel ClimaBrasil.
 *
 * A base é servida em duas camadas de propósito. O `entes.json` anterior tinha
 * 441 KB e era importado estaticamente pela rota, então viajava inteiro para o
 * navegador em toda visita — mesmo antes de o usuário escolher um ente, e
 * mesmo quando ele só queria buscar um nome.
 *
 *   indice.json        44 KB · resumo dos 51 entes, sem nenhum parecer.
 *                      Carrega junto com a página; é o que alimenta a busca,
 *                      o ranking e a priorização multicritério.
 *
 *   dossies/<slug>     5–62 KB · achados e parciais de UM ente, com o texto
 *                      integral dos pareceres. Só desce quando alguém abre
 *                      aquele ente.
 *
 * Os arquivos são gerados por `analise/gerar-dados.mjs` a partir do CSV
 * oficial. Não edite à mão.
 */

import indiceBruto from "@/data/indice.json";
import type { Achado, MediaNacional, ResumoEixo } from "@/lib/achados";

/** Resumo de um componente, com a distribuição por degrau da escala oficial. */
export interface ResumoComponente extends ResumoEixo {
  /**
   * Quantos requisitos em cada degrau: [Sem progresso, Inicial, Intermediário,
   * Avançado]. É o que permite calcular alavancagem sem carregar parecer
   * nenhum — os 1.113 requisitos "quase lá" do país.
   */
  d: number[];
}

/** O que o índice sabe sobre um ente: tudo, menos os pareceres. */
export interface EnteResumo {
  tipo: string;
  /** Código IBGE — a chave de junção com qualquer base territorial. */
  id: number | null;
  pop: number | null;
  tot: number;
  lac: number;
  mat: number;
  rank: number;
  eixos: Record<string, ResumoEixo>;
  comps: Record<string, ResumoComponente>;
}

/** Um requisito com ação parcial documentada — já saiu do zero. */
export interface Parcial extends Achado {
  /** 1 = Estágio inicial, 2 = Estágio intermediário. */
  grau: number;
}

export interface Dossie {
  achados: Achado[];
  parciais: Parcial[];
}

export interface Indice {
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
  entes: Record<string, EnteResumo>;
}

export const INDICE = indiceBruto as unknown as Indice;
export const META = INDICE.meta;
export const ENTES = INDICE.entes;

/** Nomes em ordem alfabética brasileira, para busca e listagem. */
export const NOMES_ENTES = Object.keys(ENTES).sort((a, b) => a.localeCompare(b, "pt-BR"));

/** Mesma regra do gerador — precisa bater com o nome do arquivo em disco. */
export function slugificar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Os dossiês entram como módulos carregados sob demanda. O glob é resolvido em
 * tempo de build, então cada ente vira um pedaço próprio do bundle.
 */
const DOSSIES = import.meta.glob<{ default: Dossie }>("../data/dossies/*.json");

const cache = new Map<string, Dossie>();

/**
 * Carrega o dossiê de um ente. Devolve null quando o ente não existe — quem
 * chama precisa saber a diferença entre "não achei" e "achei e está vazio".
 */
export async function carregarDossie(nome: string): Promise<Dossie | null> {
  const emCache = cache.get(nome);
  if (emCache) return emCache;

  const caminho = `../data/dossies/${slugificar(nome)}.json`;
  const carregar = DOSSIES[caminho];
  if (!carregar) return null;

  const modulo = await carregar();
  const dossie = modulo.default;
  cache.set(nome, dossie);
  return dossie;
}

/** Taxas de lacuna dos demais entes — entrada de `posicaoProjetada`. */
export function taxasDosOutros(nome: string): number[] {
  return Object.entries(ENTES)
    .filter(([n]) => n !== nome)
    .map(([, e]) => (e.tot ? (100 * e.lac) / e.tot : 0));
}
