/**
 * Receita realizada de cada ente, do SICONFI / Tesouro Nacional.
 *
 * POR QUE ESTE DADO IMPORTA
 *
 * O eixo Financiamento é o mais frágil do país — F1, F2 e F3 somam 184 das 640
 * lacunas. Mas "não destinou orçamento ao clima" significa coisas diferentes
 * num estado que arrecada R$ 11 bilhões e num município que arrecada R$ 1
 * bilhão. A receita realizada distingue *não gastou* de *não tinha*, e é a
 * única forma honesta de comparar entes de porte muito diferente no eixo que
 * mais pesa.
 *
 * O QUE ESTE ARQUIVO NÃO FAZ
 *
 * Não entra no índice multicritério. Acrescentar um sexto critério mudaria os
 * pesos dos outros cinco e exigiria recalibrar o modelo inteiro — é decisão de
 * equipe, não efeito colateral de uma ingestão. Aqui o dado entra como
 * CONTEXTO: aparece no dossiê e fica disponível para o agente responder
 * "quanto este ente arrecada?".
 *
 * INGESTÃO EM ETAPA DE BUILD, NUNCA EM TEMPO DE VISITA
 *
 * O resultado é gravado em cache versionado, com a data de extração. O produto
 * continua offline e rápido, e — o que importa mais — toda peça emitida
 * consegue dizer de onde veio cada número.
 *
 * Fonte: https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca
 *        DCA Anexo I-C, conta TotalReceitas.
 *
 * Uso:  node analise/ingerir-siconfi.mjs [exercicio]
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const INDICE = join(AQUI, "..", "frontend", "src", "data", "indice.json");
const CACHE = join(AQUI, "dados", "financas-siconfi.json");

const EXERCICIO = Number(process.argv[2]) || 2023;
const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca";

/** O Tesouro limita requisições por minuto; uma pausa curta evita o 429. */
const PAUSA_MS = 900;
const TENTATIVAS = 3;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function receitaDe(idEnte) {
  const url =
    `${BASE}?an_exercicio=${EXERCICIO}` +
    `&no_anexo=${encodeURIComponent("DCA-Anexo I-C")}` +
    `&co_tipo_demonstrativo=DCA&id_ente=${idEnte}`;

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      if (resposta.status === 429) {
        await dormir(PAUSA_MS * 4 * tentativa);
        continue;
      }
      if (!resposta.ok) return { erro: `HTTP ${resposta.status}` };

      const corpo = await resposta.json();
      const linha = (corpo.items ?? []).find(
        (i) => i.cod_conta === "TotalReceitas" && i.coluna === "Receitas Brutas Realizadas",
      );
      if (!linha) return { erro: "conta TotalReceitas ausente" };

      return { receita: Number(linha.valor), instituicao: linha.instituicao ?? null };
    } catch (erro) {
      if (tentativa === TENTATIVAS) {
        return { erro: erro instanceof Error ? erro.message : String(erro) };
      }
      await dormir(PAUSA_MS * 2 * tentativa);
    }
  }
  return { erro: "esgotou as tentativas" };
}

async function main() {
  const indice = JSON.parse(readFileSync(INDICE, "utf8"));
  const entes = Object.entries(indice.entes).filter(([, e]) => e.id != null);

  // O cache anterior é reaproveitado: quem já respondeu não é consultado de novo.
  const anterior = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : null;
  const reaproveitavel = anterior?.exercicio === EXERCICIO ? (anterior.entes ?? {}) : {};

  const resultado = {};
  const falhas = [];
  let consultados = 0;

  for (const [nome, ente] of entes) {
    const emCache = reaproveitavel[nome];
    if (emCache?.receita != null) {
      resultado[nome] = emCache;
      continue;
    }

    let dado = await receitaDe(ente.id);
    consultados += 1;

    // O Distrito Federal aparece na base com código municipal (5300108) mas
    // publica a DCA sob o código de UF (53), porque acumula as competências
    // dos dois entes. Vale para qualquer ente com código de 7 dígitos que o
    // Tesouro registre como unidade federativa.
    if (dado.erro && String(ente.id).length === 7 && ente.tipo === "Distrito Federal") {
      dado = await receitaDe(String(ente.id).slice(0, 2));
      consultados += 1;
      await dormir(PAUSA_MS);
    }

    if (dado.erro) {
      falhas.push(`${nome} (id ${ente.id}): ${dado.erro}`);
    } else {
      resultado[nome] = {
        receita: dado.receita,
        perCapita: ente.pop ? Math.round(dado.receita / ente.pop) : null,
        instituicao: dado.instituicao,
      };
    }

    process.stdout.write(`\r  consultando SICONFI… ${consultados} requisições`);
    await dormir(PAUSA_MS);
  }

  process.stdout.write("\r".padEnd(50) + "\r");

  const conteudo = {
    fonte: "SICONFI / Tesouro Nacional — DCA Anexo I-C, conta TotalReceitas",
    url: BASE,
    exercicio: EXERCICIO,
    extraidoEm: new Date().toISOString().slice(0, 10),
    entes: resultado,
  };
  writeFileSync(CACHE, JSON.stringify(conteudo, null, 1), "utf8");

  // ---- funde no índice, preservando tudo o que já estava lá
  let fundidos = 0;
  for (const [nome, dado] of Object.entries(resultado)) {
    if (!indice.entes[nome]) continue;
    indice.entes[nome].fin = {
      receita: dado.receita,
      perCapita: dado.perCapita,
      exercicio: EXERCICIO,
    };
    fundidos += 1;
  }
  indice.meta.financas = {
    fonte: conteudo.fonte,
    exercicio: EXERCICIO,
    extraidoEm: conteudo.extraidoEm,
    cobertura: fundidos,
  };
  writeFileSync(INDICE, JSON.stringify(indice), "utf8");

  console.log(`exercício        ${EXERCICIO}`);
  console.log(`entes com receita ${fundidos} de ${entes.length}`);
  console.log(`requisições novas ${consultados} (o resto veio do cache)`);
  console.log(`cache            ${CACHE.split(/[\\/]/).slice(-2).join("/")}`);

  if (falhas.length) {
    console.log(`\nsem dado (${falhas.length}):`);
    falhas.slice(0, 10).forEach((f) => console.log(`  ${f}`));
    console.log(
      "\nAusência aqui é dado ausente, não erro do produto: nem todo ente publica a DCA\n" +
        "em todo exercício. O índice simplesmente não recebe `fin` para esses.",
    );
  }

  // Conferência: receita per capita fora de faixa plausível indica junção errada.
  const suspeitos = Object.entries(resultado).filter(
    ([, d]) => d.perCapita != null && (d.perCapita < 200 || d.perCapita > 60_000),
  );
  if (suspeitos.length) {
    console.log(`\nATENÇÃO: ${suspeitos.length} entes com receita per capita fora da faixa usual:`);
    suspeitos.slice(0, 5).forEach(([n, d]) => console.log(`  ${n}: R$ ${d.perCapita}/hab`));
  } else {
    console.log(`\nconferência      receita per capita dentro da faixa plausível em todos`);
  }
}

main();
