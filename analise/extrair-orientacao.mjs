/**
 * Semeia o corpus com a orientação oficial de cada componente.
 *
 * POR QUE COMEÇAR POR AQUI, E NÃO POR NOTÍCIAS
 *
 * A curadoria de notícias e artigos é trabalho humano — vinte a trinta
 * documentos bem escolhidos valem mais que mil raspados, e alguém precisa
 * responder pela lista. O que dá para semear agora sem inventar nada é o que já
 * está no repositório e é verificável linha a linha: o manual do Painel
 * ClimaBrasil, 106 páginas, com uma seção de orientação por componente.
 *
 * Esse conteúdo é o mais útil para a primeira pergunta que um auditor faz
 * diante de um item sem progresso: "o que exatamente se esperava aqui?".
 *
 * Cada componente vira um documento com frontmatter, e o texto é TRANSCRIÇÃO —
 * não resumo. Resumir a metodologia dentro do produto que a aplica seria criar
 * uma segunda versão dela.
 *
 * Uso:  node analise/extrair-orientacao.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const MANUAL = join(AQUI, "dados", "manual-pcb.txt");
const INDICE = join(AQUI, "..", "frontend", "src", "data", "indice.json");
const CORPUS = join(AQUI, "corpus");

/** A data do manual. Anterior à extração, então passa no corte. */
const DATA_DO_MANUAL = "2025-01-01";

/** Quanto de cada seção vai para o corpus. Além disso vira ruído no BM25. */
const LIMITE_DE_CARACTERES = 2600;

function main() {
  if (!existsSync(CORPUS)) mkdirSync(CORPUS, { recursive: true });

  const manual = readFileSync(MANUAL, "utf8").replace(/\r\n/g, "\n");
  const indice = JSON.parse(readFileSync(INDICE, "utf8"));
  const componentes = indice.meta.componentes;

  const codigos = Object.keys(componentes).sort();
  const escritos = [];
  const semSecao = [];

  for (const codigo of codigos) {
    /*
     * O manual abre a seção de cada componente com "G1 – Quadro legal e
     * regulatório" (travessão, não hífen simples). O nome vem do índice para
     * não depender de OCR.
     */
    const nome = componentes[codigo];
    const abertura = new RegExp(
      `${codigo}\\s*[–\\-]\\s*${nome.slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "i",
    );

    /*
     * Cada cabeçalho aparece DUAS vezes: uma no sumário — seguida de pontinhos
     * e do próximo item — e outra abrindo a seção de verdade. Pegar a primeira
     * ocorrência devolvia um trecho de dois caracteres, e era por isso que só
     * três dos quinze componentes saíam. Procuramos todas e ficamos com a que
     * tem mais texto até o próximo cabeçalho: essa é a seção.
     */
    const todas = new RegExp(abertura.source, "gi");
    let melhor = "";

    for (const ocorrencia of manual.matchAll(todas)) {
      const depois = manual.slice((ocorrencia.index ?? 0) + ocorrencia[0].length);
      const proximo = depois.search(/[A-Z]\d\s*[–—-]\s*[A-ZÀ-Ú]/);
      const candidato = (proximo > 0 ? depois.slice(0, proximo) : depois)
        .replace(/\.{4,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (candidato.length > melhor.length) melhor = candidato;
    }

    const trecho = melhor.slice(0, LIMITE_DE_CARACTERES);

    if (trecho.length < 200) {
      semSecao.push(codigo);
      continue;
    }

    const conteudo = [
      "---",
      `titulo: Orientação oficial — ${codigo} ${nome}`,
      "fonte: Manual do Painel ClimaBrasil, Tribunal de Contas da União",
      `data: ${DATA_DO_MANUAL}`,
      "tipo: metodologia-oficial",
      "url: https://climatescanner.org/pt/downloads-2/",
      `componentes: ${codigo}`,
      "---",
      "",
      `Transcrição da seção do manual que orienta a avaliação de ${codigo} — ${nome}.`,
      "Descreve o que se espera encontrar e como classificar o item.",
      "",
      `${codigo} – ${nome}. ${trecho}`,
      "",
    ].join("\n");

    writeFileSync(join(CORPUS, `manual-${codigo.toLowerCase()}.md`), conteudo, "utf8");
    escritos.push(codigo);
  }

  console.log(`documentos escritos  ${escritos.length}  (${escritos.join(" ")})`);
  if (semSecao.length) {
    console.log(`sem seção no manual  ${semSecao.join(" ")}`);
    console.log("  (o OCR do PDF pode ter quebrado o cabeçalho; vale conferir à mão)");
  }
  console.log(`pasta                analise/corpus/`);
}

main();
