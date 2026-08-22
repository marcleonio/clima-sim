/**
 * Converte a malha territorial do IBGE em caminhos SVG prontos para uso.
 *
 * Por que assim, e não com uma biblioteca de mapa: um mapa coroplético de 27
 * unidades não precisa de tile server, nem de projeção configurável, nem de
 * runtime de 200 KB. Precisa de 27 atributos `d`. Gerados aqui, o mapa vira
 * SVG inline — herda a paleta por variável CSS, funciona nos dois temas,
 * imprime junto com a página e não faz nenhuma requisição.
 *
 * Origem da malha:
 *   https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR
 *     ?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF
 *
 * O `codarea` de cada feature é o código IBGE da UF (2 dígitos), que é
 * exatamente o `id` dos entes do tipo Estado. Para as capitais, os dois
 * primeiros dígitos do código municipal dizem a que UF pertencem.
 *
 * Uso:  node analise/gerar-mapa.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const MALHA = join(AQUI, "dados", "malha-uf-ibge.geojson");
const SAIDA = join(AQUI, "..", "frontend", "src", "data", "mapa-brasil.json");

/** Tela do mapa, em unidades de viewBox. */
const LARGURA = 620;
const ALTURA = 660;
const MARGEM = 10;

/**
 * Tolerância da simplificação, em unidades da tela. Acima de ~0,7 o litoral do
 * Nordeste começa a perder reentrâncias reconhecíveis; abaixo de ~0,3 o arquivo
 * dobra sem ganho visível no tamanho em que o mapa é desenhado.
 */
const TOLERANCIA = 0.45;

/** Uma casa decimal basta na escala em que o mapa é desenhado. */
const CASAS = 1;

/**
 * Capitais avaliadas, em grau decimal. São dado de referência estável —
 * ficam aqui em vez de virarem mais uma dependência de rede.
 */
const CAPITAIS = {
  1200401: { nome: "Rio Branco", lon: -67.8099, lat: -9.9754 },
  2704302: { nome: "Maceió", lon: -35.7353, lat: -9.6658 },
  1600303: { nome: "Macapá", lon: -51.0694, lat: 0.0356 },
  1302603: { nome: "Manaus", lon: -60.0212, lat: -3.119 },
  2927408: { nome: "Salvador", lon: -38.5014, lat: -12.9777 },
  2304400: { nome: "Fortaleza", lon: -38.5267, lat: -3.7319 },
  5300108: { nome: "Brasília", lon: -47.8823, lat: -15.7939 },
  3205309: { nome: "Vitória", lon: -40.3128, lat: -20.3155 },
  2111300: { nome: "São Luís", lon: -44.3028, lat: -2.5297 },
  5103403: { nome: "Cuiabá", lon: -56.0949, lat: -15.6014 },
  5002704: { nome: "Campo Grande", lon: -54.6462, lat: -20.4697 },
  3106200: { nome: "Belo Horizonte", lon: -43.9345, lat: -19.9167 },
  1501402: { nome: "Belém", lon: -48.5044, lat: -1.4558 },
  2507507: { nome: "João Pessoa", lon: -34.8631, lat: -7.1195 },
  4106902: { nome: "Curitiba", lon: -49.2731, lat: -25.4284 },
  2611606: { nome: "Recife", lon: -34.8811, lat: -8.0539 },
  2211001: { nome: "Teresina", lon: -42.8019, lat: -5.0892 },
  3304557: { nome: "Rio de Janeiro", lon: -43.1729, lat: -22.9068 },
  2408102: { nome: "Natal", lon: -35.2094, lat: -5.7945 },
  4314902: { nome: "Porto Alegre", lon: -51.2177, lat: -30.0346 },
  1100205: { nome: "Porto Velho", lon: -63.9004, lat: -8.7619 },
  1400100: { nome: "Boa Vista", lon: -60.6753, lat: 2.8235 },
  4205407: { nome: "Florianópolis", lon: -48.548, lat: -27.5954 },
  3550308: { nome: "São Paulo", lon: -46.6333, lat: -23.5505 },
  1721000: { nome: "Palmas", lon: -48.3336, lat: -10.1841 },
};

// ------------------------------------------------------------------ geometria

/** Distância perpendicular de um ponto à reta AB. */
function distanciaDaReta(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const norma = dx * dx + dy * dy;
  if (norma === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / norma));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer–Douglas–Peucker: descarta pontos que não mudam a forma. */
function simplificar(pontos, tolerancia) {
  if (pontos.length < 3) return pontos;

  let indiceMaior = 0;
  let maior = 0;
  for (let i = 1; i < pontos.length - 1; i += 1) {
    const d = distanciaDaReta(pontos[i], pontos[0], pontos[pontos.length - 1]);
    if (d > maior) {
      maior = d;
      indiceMaior = i;
    }
  }

  if (maior <= tolerancia) return [pontos[0], pontos[pontos.length - 1]];

  const esquerda = simplificar(pontos.slice(0, indiceMaior + 1), tolerancia);
  const direita = simplificar(pontos.slice(indiceMaior), tolerancia);
  return [...esquerda.slice(0, -1), ...direita];
}

function main() {
  const geo = JSON.parse(readFileSync(MALHA, "utf8"));

  // ---- limites reais dos dados
  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;

  const percorrer = (geometria, aoVisitar) => {
    const aneis =
      geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;
    for (const poligono of aneis) for (const anel of poligono) aoVisitar(anel);
  };

  for (const f of geo.features) {
    percorrer(f.geometry, (anel) => {
      for (const [lon, lat] of anel) {
        if (lon < lonMin) lonMin = lon;
        if (lon > lonMax) lonMax = lon;
        if (lat < latMin) latMin = lat;
        if (lat > latMax) latMax = lat;
      }
    });
  }

  /**
   * Equirretangular com correção pelo cosseno da latitude média.
   *
   * Não é uma projeção de área igual, mas o mapa aqui é um instrumento de
   * localização — o dado quantitativo está na cor e no número, não na área da
   * forma. O que ela precisa garantir é que o Brasil não saia achatado, e a
   * correção pelo cosseno faz isso.
   */
  const latMedia = ((latMin + latMax) / 2) * (Math.PI / 180);
  const fatorLon = Math.cos(latMedia);

  const larguraGeo = (lonMax - lonMin) * fatorLon;
  const alturaGeo = latMax - latMin;
  const escala = Math.min(
    (LARGURA - MARGEM * 2) / larguraGeo,
    (ALTURA - MARGEM * 2) / alturaGeo,
  );
  const deslocX = (LARGURA - larguraGeo * escala) / 2;
  const deslocY = (ALTURA - alturaGeo * escala) / 2;

  const projetar = ([lon, lat]) => [
    deslocX + (lon - lonMin) * fatorLon * escala,
    // y cresce para baixo no SVG; latitude cresce para cima
    deslocY + (latMax - lat) * escala,
  ];

  const arred = (v) => Number(v.toFixed(CASAS));

  // ---- caminhos por UF
  const ufs = {};
  let pontosAntes = 0;
  let pontosDepois = 0;

  for (const f of geo.features) {
    const partes = [];
    percorrer(f.geometry, (anel) => {
      pontosAntes += anel.length;
      const projetado = anel.map(projetar);
      const simples = simplificar(projetado, TOLERANCIA);
      // Um anel com menos de 4 pontos não fecha uma forma visível.
      if (simples.length < 4) return;
      pontosDepois += simples.length;
      partes.push(
        `M${simples
          .map(([x, y]) => `${arred(x)},${arred(y)}`)
          .join("L")}Z`,
      );
    });
    ufs[f.properties.codarea] = partes.join("");
  }

  // ---- capitais projetadas
  const capitais = {};
  for (const [codigo, c] of Object.entries(CAPITAIS)) {
    const [x, y] = projetar([c.lon, c.lat]);
    capitais[codigo] = { nome: c.nome, x: arred(x), y: arred(y), uf: codigo.slice(0, 2) };
  }

  const mapa = { viewBox: `0 0 ${LARGURA} ${ALTURA}`, ufs, capitais };
  writeFileSync(SAIDA, JSON.stringify(mapa), "utf8");

  const kb = (readFileSync(SAIDA).length / 1024).toFixed(0);
  console.log(`UFs              ${Object.keys(ufs).length}`);
  console.log(`capitais         ${Object.keys(capitais).length}`);
  console.log(
    `pontos           ${pontosAntes} -> ${pontosDepois}  (${(
      (100 * (pontosAntes - pontosDepois)) / pontosAntes
    ).toFixed(0)}% a menos)`,
  );
  console.log(`mapa-brasil.json ${kb} KB`);

  const vazios = Object.entries(ufs).filter(([, d]) => !d);
  if (vazios.length) {
    console.error(`FALHA: ${vazios.length} UFs sem caminho: ${vazios.map(([c]) => c).join(", ")}`);
    process.exit(1);
  }

  // Toda capital tem que cair dentro da tela, senão a projeção está errada.
  const fora = Object.entries(capitais).filter(
    ([, c]) => c.x < 0 || c.y < 0 || c.x > LARGURA || c.y > ALTURA,
  );
  if (fora.length) {
    console.error(`FALHA: capitais fora da tela: ${fora.map(([, c]) => c.nome).join(", ")}`);
    process.exit(1);
  }
  console.log(`conferência      todas as UFs têm caminho e todas as capitais caem dentro da tela`);
}

main();
