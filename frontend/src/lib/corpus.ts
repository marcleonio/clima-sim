import bruto from "@/data/corpus.json";

/**
 * Busca no corpus de contexto, por BM25.
 *
 * A REGRA QUE SEPARA AS PRATELEIRAS
 *
 * O que sai daqui NUNCA sustenta afirmação de fato sobre um ente. Sustenta
 * LINHA DE INVESTIGAÇÃO — que é o que um auditor faz: formula hipótese e depois
 * testa. Os pareceres de auditoria são evidência; isto é contexto.
 *
 * A distinção não é estilística. Se contexto e evidência entrarem na mesma
 * prateleira, o produto perde o que o torna defensável diante de um tribunal.
 * Por isso toda resposta desta função carrega `natureza: "contexto"` e a
 * procedência do documento, e o prompt do agente tem instrução explícita sobre
 * como apresentá-la.
 *
 * BM25 e não banco vetorial: busca léxica é determinística e inspecionável.
 * Num produto de controle, um resultado que ninguém consegue explicar não
 * serve.
 */

export interface DocumentoCorpus {
  id: string;
  titulo: string;
  fonte: string;
  data: string;
  tipo: string;
  url: string | null;
  componentes: string[];
  texto: string;
  tf: Record<string, number>;
  tamanho: number;
}

export interface Corpus {
  meta: {
    documentos: number;
    corteDeData: string;
    gerado: string;
    mediaTamanho: number;
    pesoPorTipo: Record<string, number>;
    regra: string;
  };
  idf: Record<string, number>;
  documentos: DocumentoCorpus[];
}

export const CORPUS = bruto as unknown as Corpus;

/** Parâmetros clássicos do BM25. */
const K1 = 1.5;
const B = 0.75;

const VAZIAS = new Set(
  ("a o e de da do das dos em no na nos nas um uma uns umas para por com sem sobre " +
    "que se ao aos as os à às pelo pela pelos pelas entre até como mais menos muito " +
    "ser estar ter haver são foi era este esta esse essa aquele aquela isso isto seu " +
    "sua seus suas ou nao não já também apenas cada qual quais onde quando").split(" "),
);

function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !VAZIAS.has(t));
}

export interface Achado {
  documento: DocumentoCorpus;
  pontuacao: number;
  /** O trecho que casou, para a resposta poder citar em vez de resumir. */
  trecho: string;
}

/**
 * Busca contexto para um componente.
 *
 * O componente é obrigatório de propósito: indexar e buscar por ENTE convidaria
 * o modelo a casar notícia local com item local e narrar causa. Buscar por tema
 * do requisito devolve contexto sobre o problema, não sobre o culpado.
 */
export function buscarContexto(
  componente: string,
  termo = "",
  limite = 3,
): Achado[] {
  const candidatos = CORPUS.documentos.filter((d) => d.componentes.includes(componente));
  if (!candidatos.length) return [];

  const consulta = tokenizar(termo);
  if (!consulta.length) {
    // Sem termo, devolve o mais relevante pelo peso da fonte — não o primeiro
    // da lista, que seria ordem de arquivo.
    return candidatos
      .map((d) => ({
        documento: d,
        pontuacao: CORPUS.meta.pesoPorTipo[d.tipo] ?? 0.5,
        trecho: d.texto.slice(0, 500),
      }))
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, limite);
  }

  const media = CORPUS.meta.mediaTamanho || 1;

  return candidatos
    .map((d) => {
      let pontuacao = 0;
      for (const termo of consulta) {
        const f = d.tf[termo];
        if (!f) continue;
        const idf = CORPUS.idf[termo] ?? 0;
        pontuacao += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.tamanho) / media)));
      }
      // O peso da fonte entra aqui: blog e revisão por pares não são
      // equivalentes, e a ordenação precisa refletir isso.
      pontuacao *= CORPUS.meta.pesoPorTipo[d.tipo] ?? 0.5;

      return { documento: d, pontuacao, trecho: trechoRelevante(d.texto, consulta) };
    })
    .filter((r) => r.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite);
}

/**
 * A janela de texto com mais termos da consulta.
 *
 * Devolver o começo do documento seria mais simples e quase sempre errado — o
 * trecho que responde raramente é a abertura.
 */
function trechoRelevante(texto: string, consulta: string[], janela = 480): string {
  if (texto.length <= janela) return texto;

  const alvo = new Set(consulta);
  const palavras = texto.split(/\s+/);
  const normalizar = (p: string) =>
    p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

  let melhorInicio = 0;
  let melhorAcertos = -1;
  const passo = 12;
  const tamanhoJanela = Math.max(40, Math.round(janela / 6));

  for (let i = 0; i < palavras.length; i += passo) {
    let acertos = 0;
    for (let j = i; j < Math.min(i + tamanhoJanela, palavras.length); j += 1) {
      if (alvo.has(normalizar(palavras[j]!))) acertos += 1;
    }
    if (acertos > melhorAcertos) {
      melhorAcertos = acertos;
      melhorInicio = i;
    }
  }

  const trecho = palavras.slice(melhorInicio, melhorInicio + tamanhoJanela).join(" ");
  return (melhorInicio > 0 ? "… " : "") + trecho + (melhorInicio + tamanhoJanela < palavras.length ? " …" : "");
}
