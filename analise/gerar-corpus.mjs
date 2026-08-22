/**
 * O corpus de contexto do agente, indexado por BM25.
 *
 * A TENSÃO QUE ESTE ARQUIVO EXISTE PARA RESOLVER
 *
 * Todo o ClimaSim se apoia em duas regras: o modelo não produz fatos, e o
 * produto não afirma causalidade. Um corpus de notícias e artigos existe
 * justamente para sugerir causas. Se ele entrar na mesma prateleira que os
 * pareceres de auditoria, o produto perde o que o torna defensável.
 *
 * A saída não é recusar o corpus — é separar as prateleiras. O que sai daqui
 * NUNCA sustenta afirmação de fato sobre um ente; sustenta LINHA DE
 * INVESTIGAÇÃO, que é o que um auditor de verdade faz: formula hipótese e
 * depois testa.
 *
 * DUAS REGRAS DO INGESTOR
 *
 * 1. CORTE DE DATA. Nada posterior à extração da avaliação entra. Explicar uma
 *    avaliação de setembro de 2025 com notícia de 2026 é anacronismo — o
 *    auditor não tinha aquilo à frente quando avaliou.
 *
 * 2. INDEXAÇÃO POR COMPONENTE, NÃO POR ENTE. Indexar por "Bahia" convida o
 *    modelo a casar notícia local com achado local e narrar causa. Indexar por
 *    tema do requisito devolve contexto sobre o problema, não sobre o culpado.
 *
 * BM25 e não banco vetorial: busca léxica clássica é determinística,
 * inspecionável, e sobra para um corpus de algumas centenas de documentos. Um
 * resultado que ninguém consegue explicar não serve a um produto de controle.
 *
 * Uso:  node analise/gerar-corpus.mjs
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA = join(AQUI, "corpus");
const INDICE = join(AQUI, "..", "frontend", "src", "data", "indice.json");
const SAIDA = join(AQUI, "..", "frontend", "src", "data", "corpus.json");

/** Peso por tipo de fonte. Blog e revisão por pares não são equivalentes. */
const PESO_POR_TIPO = {
  "revisado-por-pares": 1.0,
  "metodologia-oficial": 1.0,
  "relatorio-institucional": 0.85,
  norma: 0.85,
  jornalismo: 0.6,
};

/** Radicais de palavra que não distinguem nada em português. */
const VAZIAS = new Set(
  ("a o e de da do das dos em no na nos nas um uma uns umas para por com sem sobre " +
    "que se ao aos as os à às pelo pela pelos pelas entre até como mais menos muito " +
    "ser estar ter haver são foi era este esta esse essa aquele aquela isso isto seu " +
    "sua seus suas ou nao não já também apenas cada qual quais onde quando").split(" "),
);

function tokenizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !VAZIAS.has(t));
}

/** Frontmatter simples: `chave: valor` entre duas linhas de três traços. */
function lerDocumento(caminho, nome) {
  const bruto = readFileSync(caminho, "utf8");
  const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { erro: "sem frontmatter" };

  const meta = {};
  for (const linha of m[1].split(/\r?\n/)) {
    const i = linha.indexOf(":");
    if (i < 0) continue;
    const chave = linha.slice(0, i).trim();
    const valor = linha.slice(i + 1).trim();
    meta[chave] = chave === "componentes" ? valor.split(/[,\s]+/).filter(Boolean) : valor;
  }

  return { meta, texto: m[2].trim(), arquivo: nome };
}

function main() {
  if (!existsSync(PASTA)) {
    mkdirSync(PASTA, { recursive: true });
    console.log(`pasta ${PASTA} criada — sem documentos ainda.`);
  }

  const indice = JSON.parse(readFileSync(INDICE, "utf8"));
  const corte = indice.meta.snapshot;
  const validos = new Set(Object.keys(indice.meta.componentes));

  const arquivos = readdirSync(PASTA).filter((f) => f.endsWith(".md"));
  const documentos = [];
  const rejeitados = [];

  for (const nome of arquivos) {
    const doc = lerDocumento(join(PASTA, nome), nome);
    if (doc.erro) {
      rejeitados.push(`${nome}: ${doc.erro}`);
      continue;
    }

    const { meta, texto } = doc;

    for (const obrigatorio of ["titulo", "fonte", "data", "tipo"]) {
      if (!meta[obrigatorio]) {
        rejeitados.push(`${nome}: falta "${obrigatorio}" no frontmatter`);
        meta.__invalido = true;
      }
    }
    if (meta.__invalido) continue;

    if (!PESO_POR_TIPO[meta.tipo]) {
      rejeitados.push(`${nome}: tipo "${meta.tipo}" desconhecido`);
      continue;
    }

    // A regra do corte de data.
    if (meta.data > corte) {
      rejeitados.push(`${nome}: data ${meta.data} é posterior à extração ${corte}`);
      continue;
    }

    const componentes = (meta.componentes ?? []).filter((c) => validos.has(c));
    if (!componentes.length) {
      rejeitados.push(`${nome}: nenhum componente válido em "componentes"`);
      continue;
    }

    documentos.push({
      id: nome.replace(/\.md$/, ""),
      titulo: meta.titulo,
      fonte: meta.fonte,
      data: meta.data,
      tipo: meta.tipo,
      url: meta.url ?? null,
      componentes,
      texto,
      tokens: tokenizar(`${meta.titulo} ${texto}`),
    });
  }

  // ---- BM25
  const N = documentos.length;
  const df = new Map();
  for (const d of documentos) {
    for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const mediaTamanho = N ? documentos.reduce((s, d) => s + d.tokens.length, 0) / N : 0;

  const idf = {};
  for (const [termo, freq] of df) {
    idf[termo] = Math.log(1 + (N - freq + 0.5) / (freq + 0.5));
  }

  const corpus = {
    meta: {
      documentos: N,
      corteDeData: corte,
      gerado: new Date().toISOString().slice(0, 10),
      mediaTamanho: Math.round(mediaTamanho),
      pesoPorTipo: PESO_POR_TIPO,
      regra:
        "O que sai daqui sustenta linha de investigação, nunca afirmação de fato sobre um ente. " +
        "Nada posterior à extração da avaliação entra, e a indexação é por componente, não por ente.",
    },
    idf,
    documentos: documentos.map((d) => ({
      id: d.id,
      titulo: d.titulo,
      fonte: d.fonte,
      data: d.data,
      tipo: d.tipo,
      url: d.url,
      componentes: d.componentes,
      texto: d.texto,
      // frequência de cada termo, para o BM25 não precisar retokenizar no cliente
      tf: d.tokens.reduce((acc, t) => {
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      }, {}),
      tamanho: d.tokens.length,
    })),
  };

  writeFileSync(SAIDA, JSON.stringify(corpus), "utf8");

  console.log(`documentos       ${N} de ${arquivos.length} arquivos`);
  console.log(`corte de data    ${corte} (nada posterior entra)`);
  console.log(`termos indexados ${Object.keys(idf).length}`);
  console.log(`corpus.json      ${(readFileSync(SAIDA).length / 1024).toFixed(0)} KB`);

  const porTipo = {};
  for (const d of documentos) porTipo[d.tipo] = (porTipo[d.tipo] ?? 0) + 1;
  console.log(`por tipo         ${Object.entries(porTipo).map(([t, n]) => `${t} ${n}`).join(" · ") || "—"}`);

  const cobertos = new Set(documentos.flatMap((d) => d.componentes));
  const semCobertura = [...validos].filter((c) => !cobertos.has(c)).sort();
  console.log(`cobertura        ${cobertos.size} de ${validos.size} componentes`);
  if (semCobertura.length) {
    console.log(`sem contexto     ${semCobertura.join(" ")}`);
  }

  if (rejeitados.length) {
    console.log(`\nrejeitados (${rejeitados.length}):`);
    for (const r of rejeitados) console.log(`  ${r}`);
  }
}

main();
