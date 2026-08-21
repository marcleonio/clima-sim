#!/usr/bin/env node
// Gera uma cópia do CSV do Painel ClimaBrasil com o ano da avaliação trocado, para testar
// o endpoint de upload (POST /api/reports/upload) e o gráfico de evolução com mais de um
// snapshot no histórico. Só troca o ano em assessment_completion_dt e assessment_version -
// o texto livre de assessment_comment (que às vezes cita anos de orçamento, ex. "2024" e
// "2025") não é tocado, por isso o CSV é parseado como CSV de verdade, não com um replace
// de texto ingênuo.
//
// Uso:
//   node scripts/gerar-csv-ano.js --ano 2026
//   node scripts/gerar-csv-ano.js --ano 2026 --origem caminho/origem.csv --saida caminho/saida.csv
//
// Sem --origem, usa src/main/resources/pcb-raw-data.csv (o CSV base do app).
// Sem --saida, escreve em data/pcb-raw-data-<ano>.csv (pasta local, fora do controle de versão).

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const chave = a.slice(2);
      const valor = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[chave] = valor;
    }
  }
  return args;
}

// Parser CSV (RFC 4180): aspas duplas, campos com vírgula/quebra de linha entre aspas,
// aspas escapadas como "". Necessário porque assessment_comment é multi-linha e contém
// vírgulas - um split ingênuo por linha/vírgula corromperia o arquivo.
function parseCsv(text) {
  const linhas = [];
  let campo = "";
  let linha = [];
  let dentroDeAspas = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          campo += '"';
          i += 2;
          continue;
        }
        dentroDeAspas = false;
        i++;
        continue;
      }
      campo += c;
      i++;
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
      i++;
      continue;
    }
    if (c === ",") {
      linha.push(campo);
      campo = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      campo = "";
      linha = [];
      i++;
      continue;
    }
    campo += c;
    i++;
  }

  // Última linha, se o arquivo não terminar com quebra de linha.
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

function precisaDeAspas(campo) {
  return campo.includes(",") || campo.includes('"') || campo.includes("\n") || campo.includes("\r");
}

function escaparCampo(campo) {
  if (!precisaDeAspas(campo)) return campo;
  return `"${campo.replace(/"/g, '""')}"`;
}

function serializarCsv(linhas) {
  return linhas.map((linha) => linha.map(escaparCampo).join(",")).join("\r\n") + "\r\n";
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const anoDestino = args.ano ? String(args.ano) : null;
  if (!anoDestino || !/^\d{4}$/.test(anoDestino)) {
    console.error("Uso: node gerar-csv-ano.js --ano 2026 [--origem origem.csv] [--saida saida.csv]");
    process.exit(1);
  }

  const origem = path.resolve(
    args.origem ? String(args.origem) : path.join(__dirname, "..", "src", "main", "resources", "pcb-raw-data.csv"),
  );
  const saida = path.resolve(
    args.saida ? String(args.saida) : path.join(__dirname, "..", "data", `pcb-raw-data-${anoDestino}.csv`),
  );

  if (!fs.existsSync(origem)) {
    console.error(`Arquivo de origem não encontrado: ${origem}`);
    process.exit(1);
  }

  // BOM (UTF-8) no início do arquivo original - preservado na saída para manter o mesmo
  // comportamento de leitura do backend (CsvLoaderService lê como UTF-8).
  const bruto = fs.readFileSync(origem, "utf8");
  const temBom = bruto.charCodeAt(0) === 0xfeff;
  const texto = temBom ? bruto.slice(1) : bruto;

  const linhas = parseCsv(texto);
  if (linhas.length < 2) {
    console.error("CSV de origem vazio ou sem dados.");
    process.exit(1);
  }

  const cabecalho = linhas[0];
  const idxData = cabecalho.indexOf("assessment_completion_dt");
  const idxVersao = cabecalho.indexOf("assessment_version");

  if (idxData === -1) {
    console.error('Coluna "assessment_completion_dt" não encontrada no CSV de origem.');
    process.exit(1);
  }

  // Ano de origem = ano da primeira linha de dados (é o que o CsvLoaderService usa como
  // data do snapshot inteiro - assume-se um único ano por arquivo, como no CSV real).
  const anoOrigemDetectado = (linhas[1][idxData] || "").slice(0, 4);
  if (!/^\d{4}$/.test(anoOrigemDetectado)) {
    console.error(`Não foi possível detectar o ano em assessment_completion_dt: "${linhas[1][idxData]}"`);
    process.exit(1);
  }

  let linhasAlteradas = 0;
  for (let l = 1; l < linhas.length; l++) {
    const row = linhas[l];
    if (row.length <= idxData) continue;

    const dataOriginal = row[idxData];
    if (dataOriginal && dataOriginal.slice(0, 4) === anoOrigemDetectado) {
      row[idxData] = anoDestino + dataOriginal.slice(4);
      linhasAlteradas++;
    }

    if (idxVersao !== -1 && row.length > idxVersao && row[idxVersao]) {
      row[idxVersao] = row[idxVersao].split(anoOrigemDetectado).join(anoDestino);
    }
  }

  fs.mkdirSync(path.dirname(saida), { recursive: true });
  const saidaTexto = (temBom ? "﻿" : "") + serializarCsv(linhas);
  fs.writeFileSync(saida, saidaTexto, "utf8");

  console.log(`Ano de origem detectado: ${anoOrigemDetectado}`);
  console.log(`Linhas de dados com data trocada para ${anoDestino}: ${linhasAlteradas} de ${linhas.length - 1}`);
  console.log(`Arquivo gerado: ${saida}`);
  console.log(`\nAgora é só subir esse arquivo em /simulador → aba "Evolução" → "Importar novo CSV de avaliação".`);
}

main();
