/**
 * Fase do ENSO (El Niño / La Niña), do Climate Prediction Center da NOAA.
 *
 * POR QUE ESTE DADO ENTRA NUM PRODUTO DE CONTROLE EXTERNO
 *
 * Tudo no ClimaSim olha para trás: o que a auditoria encontrou numa extração de
 * setembro de 2025. O ENSO é a única fonte pública que permite olhar para a
 * PRÓXIMA ESTAÇÃO sem inventar previsão nenhuma — o índice ONI é medição de
 * anomalia de temperatura do Pacífico, publicada mensalmente desde 1950, e a
 * associação entre fase do ENSO e anomalia de chuva no Brasil é climatologia
 * estabelecida, não inferência nossa.
 *
 * O CRUZAMENTO QUE ELE PERMITE — E A LINHA QUE NÃO SE ATRAVESSA
 *
 * A pergunta que o painel passa a responder: quais entes estão na região
 * climatologicamente mais afetada pela fase atual E não demonstraram ação em
 * defesa civil ou adaptação? Isso é pauta de fiscalização para a estação que
 * vem, montada com dado observado dos dois lados.
 *
 * O que ele NÃO faz: não prevê desastre e não afirma que a omissão causará
 * dano. A afirmação defensável é de coincidência entre exposição e omissão —
 * "este ente está em região historicamente associada a anomalia de chuva na
 * fase atual do ENSO, e não demonstrou ação nos requisitos que existem para
 * lidar com isso". Qualquer redação que sugira causalidade ou profecia derruba
 * a credibilidade do projeto inteiro.
 *
 * Fonte: https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
 *
 * Uso:  node analise/ingerir-oni.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CACHE = join(AQUI, "dados", "oni-noaa.txt");
const SAIDA = join(AQUI, "..", "frontend", "src", "data", "enso.json");
const FONTE = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";

/** Quantos anos da série vão para o produto. O resto fica no cache. */
const ANOS_NO_PRODUTO = 20;

/**
 * Os limiares da NOAA. Não são escolha nossa: 0,5 é o corte oficial entre
 * neutro e evento, e 1,5 entre moderado e forte.
 */
function classificar(anomalia) {
  if (anomalia >= 1.5) return { fase: "El Niño", intensidade: "forte" };
  if (anomalia >= 1.0) return { fase: "El Niño", intensidade: "moderado" };
  if (anomalia >= 0.5) return { fase: "El Niño", intensidade: "fraco" };
  if (anomalia <= -1.5) return { fase: "La Niña", intensidade: "forte" };
  if (anomalia <= -1.0) return { fase: "La Niña", intensidade: "moderada" };
  if (anomalia <= -0.5) return { fase: "La Niña", intensidade: "fraca" };
  return { fase: "Neutro", intensidade: null };
}

async function baixar() {
  try {
    const resposta = await fetch(FONTE, { signal: AbortSignal.timeout(45_000) });
    if (!resposta.ok) return { erro: `HTTP ${resposta.status}` };
    return { texto: await resposta.text() };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : String(erro) };
  }
}

function analisar(texto) {
  return texto
    .trim()
    .split("\n")
    .slice(1)
    .map((linha) => {
      const p = linha.trim().split(/\s+/);
      return { trimestre: p[0], ano: Number(p[1]), anomalia: Number(p[3]) };
    })
    .filter((x) => x.trimestre && Number.isFinite(x.ano) && Number.isFinite(x.anomalia));
}

async function main() {
  const baixado = await baixar();

  let texto;
  if (baixado.texto) {
    writeFileSync(CACHE, baixado.texto, "utf8");
    console.log("série baixada da NOAA e gravada em cache");
  } else if (existsSync(CACHE)) {
    texto = readFileSync(CACHE, "utf8");
    console.log(`rede indisponível (${baixado.erro}); usando o cache em disco`);
  } else {
    console.error(`FALHA: sem rede (${baixado.erro}) e sem cache.`);
    process.exit(1);
  }

  const serie = analisar(texto ?? baixado.texto);
  if (serie.length < 100) {
    console.error(`FALHA: série com apenas ${serie.length} leituras — formato provavelmente mudou.`);
    process.exit(1);
  }

  const ultima = serie[serie.length - 1];
  const atual = classificar(ultima.anomalia);

  // Direção do movimento: comparar com a leitura de seis trimestres atrás diz
  // se o ciclo está entrando ou saindo de uma fase.
  const referencia = serie[Math.max(0, serie.length - 7)];
  const variacao = Number((ultima.anomalia - referencia.anomalia).toFixed(2));

  const corte = ultima.ano - ANOS_NO_PRODUTO;
  const recente = serie.filter((x) => x.ano >= corte);

  // Eventos fortes: para o leitor situar a leitura atual contra a história.
  const eventos = [];
  let dentro = null;
  for (const p of serie) {
    if (Math.abs(p.anomalia) >= 1.5) {
      const fase = p.anomalia > 0 ? "El Niño" : "La Niña";
      if (!dentro || dentro.fase !== fase) {
        if (dentro) eventos.push(dentro);
        dentro = { fase, pico: p };
      } else if (Math.abs(p.anomalia) > Math.abs(dentro.pico.anomalia)) {
        dentro.pico = p;
      }
    } else if (dentro) {
      eventos.push(dentro);
      dentro = null;
    }
  }
  if (dentro) eventos.push(dentro);

  const conteudo = {
    fonte: "Climate Prediction Center / NOAA — Oceanic Niño Index (ONI)",
    url: FONTE,
    extraidoEm: new Date().toISOString().slice(0, 10),
    leituras: serie.length,
    inicioDaSerie: `${serie[0].trimestre} ${serie[0].ano}`,
    atual: {
      trimestre: ultima.trimestre,
      ano: ultima.ano,
      anomalia: ultima.anomalia,
      ...atual,
      variacaoEmSeisTrimestres: variacao,
      direcao: variacao > 0.2 ? "subindo" : variacao < -0.2 ? "caindo" : "estável",
    },
    serie: recente.map((x) => ({ t: x.trimestre, a: x.ano, v: x.anomalia })),
    eventosFortes: eventos.slice(-6).map((e) => ({
      fase: e.fase,
      trimestre: e.pico.trimestre,
      ano: e.pico.ano,
      pico: e.pico.anomalia,
    })),
    aviso:
      "O ONI é medição de anomalia de temperatura do Pacífico. A associação com anomalia de chuva no Brasil é climatologia estabelecida; nada aqui prevê desastre nem afirma que uma omissão causará dano.",
  };

  writeFileSync(SAIDA, JSON.stringify(conteudo), "utf8");

  console.log(`leituras         ${serie.length}  (${conteudo.inicioDaSerie} a ${ultima.trimestre} ${ultima.ano})`);
  console.log(
    `fase atual       ${atual.fase}${atual.intensidade ? ` ${atual.intensidade}` : ""}  ONI ${ultima.anomalia}  (${conteudo.atual.direcao})`,
  );
  console.log(`no produto       ${recente.length} leituras dos últimos ${ANOS_NO_PRODUTO} anos`);
  console.log(`eventos fortes   ${eventos.length} desde ${serie[0].ano}`);
  console.log(`enso.json        ${(readFileSync(SAIDA).length / 1024).toFixed(0)} KB`);

  // Conferência: uma anomalia fora desta faixa indica coluna errada no arquivo.
  const absurdos = serie.filter((x) => Math.abs(x.anomalia) > 4);
  if (absurdos.length) {
    console.error(`FALHA: ${absurdos.length} leituras com |ONI| > 4 — coluna provavelmente errada.`);
    process.exit(1);
  }
  console.log("conferência      toda leitura dentro da faixa plausível de ONI");
}

main();
