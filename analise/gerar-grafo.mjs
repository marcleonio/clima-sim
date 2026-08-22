/**
 * Grafo de semelhança entre entes, por padrão de déficit.
 *
 * O QUE ELE RESPONDE
 *
 * Os 51 entes não são 51 casos isolados: eles se agrupam por *formato* de
 * fragilidade. Dois entes podem ter pontuações muito diferentes e ainda assim
 * falhar exatamente nos mesmos componentes — e essa semelhança é o que permite
 * a pergunta mais útil do produto: "quem tem o meu problema e já resolveu?".
 *
 * COMO É CONSTRUÍDO
 *
 * 1. Cada ente vira um vetor de 15 posições — o déficit em cada componente,
 *    de 0 a 1.
 * 2. A semelhança entre dois entes é o COSSENO entre os vetores. Cosseno mede
 *    o formato da fragilidade, não o tamanho dela: dois entes com o mesmo
 *    perfil ficam próximos mesmo com pontuações distantes.
 * 3. Cada ente se liga aos seus k vizinhos mais próximos. Um limiar global
 *    (testado antes com Jaccard ≥ 0,70) produzia um bolo de 23 entes ligados
 *    por um único componente — informação nenhuma. k-vizinhos dá comunidades
 *    equilibradas.
 * 4. As comunidades saem por PROPAGAÇÃO DE RÓTULOS DETERMINÍSTICA: ordem
 *    alfabética fixa e desempate pelo rótulo. Um grafo que muda de forma a cada
 *    carregamento não é analisável, e num produto de controle isso é fatal.
 * 5. O layout é calculado aqui, não no navegador. Simulação de força é cara e
 *    não determinística; rodando em build, o mesmo dado sempre desenha o mesmo
 *    grafo e a página não gasta nada.
 *
 * O QUE UMA ARESTA NÃO SIGNIFICA
 *
 * Proximidade é semelhança de padrão de falha, e nada além. Não é causa comum,
 * não é contágio, não é característica regional — a métrica não olha
 * território. A interface precisa dizer isso, porque grafo é o tipo de figura
 * que o leitor preenche sozinho com causalidade.
 *
 * Uso:  node analise/gerar-grafo.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const INDICE = join(AQUI, "..", "frontend", "src", "data", "indice.json");
const SAIDA = join(AQUI, "..", "frontend", "src", "data", "grafo.json");

/** Quantos vizinhos cada ente busca. 3 dá comunidades de 10 a 15 entes. */
const K = 3;

/** Tela do grafo, em unidades de viewBox. */
const LARGURA = 760;
const ALTURA = 560;

/** Uma comunidade menor que isto não sustenta generalização. */
const MINIMO_PARA_COMUNIDADE = 3;

/** Sigla da UF pelo código IBGE, para o rótulo curto dos estados no desenho. */
const SIGLA = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

// ------------------------------------------------------------------ métrica

function cosseno(a, b) {
  let produto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i += 1) {
    produto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  return normaA && normaB ? produto / Math.sqrt(normaA * normaB) : 0;
}

// ------------------------------------------------------------------ layout

/**
 * Força dirigida simples, com posições iniciais radiais por comunidade.
 *
 * Determinística por construção: mesma entrada, mesma saída, sempre.
 */
function posicionar(nomes, arestas, comunidadeDe, quantasComunidades) {
  const pos = {};
  const porComunidade = new Map();
  for (const n of nomes) {
    const g = comunidadeDe[n];
    if (!porComunidade.has(g)) porComunidade.set(g, []);
    porComunidade.get(g).push(n);
  }

  let i = 0;
  for (const [, membros] of [...porComunidade.entries()].sort((a, b) => a[0] - b[0])) {
    const angulo = (2 * Math.PI * i) / quantasComunidades;
    const cx = LARGURA / 2 + Math.cos(angulo) * 190;
    const cy = ALTURA / 2 + Math.sin(angulo) * 160;
    const raio = 30 + membros.length * 2.2;
    membros.forEach((n, j) => {
      const a = (2 * Math.PI * j) / membros.length;
      pos[n] = { x: cx + Math.cos(a) * raio, y: cy + Math.sin(a) * raio, vx: 0, vy: 0 };
    });
    i += 1;
  }

  for (let passo = 0; passo < 420; passo += 1) {
    // repulsão entre todos
    for (const n of nomes) {
      const p = pos[n];
      for (const m of nomes) {
        if (m === n) continue;
        const q = pos[m];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy || 0.01;
        if (d2 < 40000) {
          const f = 900 / d2;
          p.vx += dx * f;
          p.vy += dy * f;
        }
      }
    }
    // atração pelas arestas — mais curta dentro da comunidade
    for (const e of arestas) {
      const p = pos[e.a];
      const q = pos[e.b];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const alvo = comunidadeDe[e.a] === comunidadeDe[e.b] ? 62 : 150;
      const f = (d - alvo) * 0.014 * e.s;
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
      q.vx -= (dx / d) * f;
      q.vy -= (dy / d) * f;
    }
    // gravidade para o centro e amortecimento
    for (const n of nomes) {
      const p = pos[n];
      p.vx += (LARGURA / 2 - p.x) * 0.0016;
      p.vy += (ALTURA / 2 - p.y) * 0.0016;
      p.x += Math.max(-8, Math.min(8, p.vx));
      p.y += Math.max(-8, Math.min(8, p.vy));
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x = Math.max(34, Math.min(LARGURA - 34, p.x));
      p.y = Math.max(26, Math.min(ALTURA - 26, p.y));
    }
  }
  return pos;
}


// ------------------------------------------------------------------ contorno

/**
 * Casco convexo (Andrew, monotone chain), afastado para fora.
 *
 * A identidade da comunidade é carregada pela POSIÇÃO — cinco matizes
 * categóricos não passam na validação de daltonismo. Só que posição sozinha
 * exige que o leitor infira o agrupamento; um contorno tênue faz o trabalho sem
 * gastar o canal de cor, que fica livre para a rampa de pontuação.
 */
function casco(pontos, folga = 26) {
  if (pontos.length < 3) return null;

  const p = [...pontos].sort((a, b) => a.x - b.x || a.y - b.y);
  const cruz = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const baixo = [];
  for (const ponto of p) {
    while (baixo.length >= 2 && cruz(baixo[baixo.length - 2], baixo[baixo.length - 1], ponto) <= 0) {
      baixo.pop();
    }
    baixo.push(ponto);
  }

  const cima = [];
  for (const ponto of [...p].reverse()) {
    while (cima.length >= 2 && cruz(cima[cima.length - 2], cima[cima.length - 1], ponto) <= 0) {
      cima.pop();
    }
    cima.push(ponto);
  }

  const anel = [...baixo.slice(0, -1), ...cima.slice(0, -1)];
  if (anel.length < 3) return null;

  // Afasta cada vértice do centroide, para o contorno não encostar nos nós.
  const cx = anel.reduce((s, q) => s + q.x, 0) / anel.length;
  const cy = anel.reduce((s, q) => s + q.y, 0) / anel.length;

  return anel.map((q) => {
    const d = Math.hypot(q.x - cx, q.y - cy) || 1;
    return {
      x: Number((q.x + ((q.x - cx) / d) * folga).toFixed(1)),
      y: Number((q.y + ((q.y - cy) / d) * folga).toFixed(1)),
    };
  });
}

/**
 * O caráter do grupo: o componente que MAIS O DISTINGUE dos outros grupos.
 *
 * A primeira versão usava simplesmente o componente de maior déficit, e três
 * dos cinco grupos saíram chamados "Mobilização de investimentos privados" —
 * porque F3 é o eixo mais frágil do país inteiro e lidera em quase todo lugar.
 * Um rótulo que se repete não nomeia nada.
 *
 * A regra certa é o DESVIO: o componente em que este grupo está mais distante
 * da média dos grupos. Continua derivado do dado, sem batismo à mão, e agora
 * responde à pergunta que o leitor faz de fato — "o que este grupo tem de
 * diferente?".
 */
function caracterizar(deficitPorComponente, mediaPorComponente, nomes, eixoDe) {
  const desvios = Object.entries(deficitPorComponente)
    .map(([c, d]) => ({ c, desvio: d - (mediaPorComponente[c] ?? 0), deficit: d }))
    .sort((a, b) => b.desvio - a.desvio || a.c.localeCompare(b.c));

  const marcante = desvios[0];
  if (!marcante) return { eixo: null, marca: null, componente: null, desvio: 0, tipo: "misto" };

  /*
   * Um grupo pode não se destacar por fragilidade nenhuma — é o caso do grupo
   * maduro, que fica abaixo da média em todos os componentes. Chamá-lo pelo
   * "maior déficit" seria descrevê-lo pelo que ele NÃO é. Nesse caso o que o
   * distingue é a ausência de ponto fraco marcante, e o rótulo diz isso.
   */
  if (marcante.desvio < 5) {
    const melhor = desvios[desvios.length - 1];
    return {
      componente: melhor ? melhor.c : null,
      marca: "Sem fragilidade marcante",
      eixo: melhor ? eixoDe(melhor.c) : null,
      desvio: melhor ? Math.round(-melhor.desvio) : 0,
      tipo: "forte",
    };
  }

  return {
    componente: marcante.c,
    marca: nomes[marcante.c] ?? marcante.c,
    eixo: eixoDe(marcante.c),
    /** Quantos pontos percentuais acima da média dos grupos. */
    desvio: Math.round(marcante.desvio),
    tipo: "fragil",
  };
}

// ------------------------------------------------------------------ principal

function main() {
  const indice = JSON.parse(readFileSync(INDICE, "utf8"));
  const componentes = Object.keys(indice.meta.componentes).sort();
  const nomes = Object.keys(indice.entes).sort();

  const vetor = Object.fromEntries(
    nomes.map((n) => [
      n,
      componentes.map((c) => {
        const r = indice.entes[n].comps[c];
        return r && r.t ? 1 - r.m / 100 : 0;
      }),
    ]),
  );

  // ---- arestas: k vizinhos mais próximos, sem duplicar o par
  const arestas = [];
  const vizinhos = Object.fromEntries(nomes.map((n) => [n, []]));

  for (const n of nomes) {
    const ordenados = nomes
      .filter((m) => m !== n)
      .map((m) => [m, cosseno(vetor[n], vetor[m])])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    for (const [m, s] of ordenados.slice(0, K)) {
      if (!arestas.some((e) => e.a === m && e.b === n)) arestas.push({ a: n, b: m, s });
      vizinhos[n].push([m, s]);
      if (!vizinhos[m].some(([x]) => x === n)) vizinhos[m].push([n, s]);
    }
  }

  // ---- comunidades por propagação de rótulos, determinística
  const rotulo = Object.fromEntries(nomes.map((n) => [n, n]));
  for (let it = 0; it < 60; it += 1) {
    let mudou = false;
    for (const n of nomes) {
      if (!vizinhos[n].length) continue;
      const peso = {};
      for (const [v, s] of vizinhos[n]) peso[rotulo[v]] = (peso[rotulo[v]] ?? 0) + s;
      const melhor = Object.entries(peso).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0][0];
      if (melhor !== rotulo[n]) {
        rotulo[n] = melhor;
        mudou = true;
      }
    }
    if (!mudou) break;
  }

  const agrupado = new Map();
  for (const n of nomes) {
    if (!agrupado.has(rotulo[n])) agrupado.set(rotulo[n], []);
    agrupado.get(rotulo[n]).push(n);
  }
  const comunidades = [...agrupado.values()].sort(
    (a, b) => b.length - a.length || a[0].localeCompare(b[0]),
  );
  const comunidadeDe = {};
  comunidades.forEach((membros, i) => membros.forEach((n) => (comunidadeDe[n] = i)));

  const pos = posicionar(nomes, arestas, comunidadeDe, comunidades.length);

  // ---- déficit médio de cada componente, por comunidade e no conjunto
  const deficitDe = (membros) =>
    Object.fromEntries(
      componentes.map((c) => [
        c,
        (membros.reduce((s, n) => {
          const r = indice.entes[n].comps[c];
          return s + (r && r.t ? 1 - r.m / 100 : 0);
        }, 0) /
          membros.length) *
          100,
      ]),
    );

  const deficitPorComunidade = comunidades.map(deficitDe);
  const mediaPorComponente = Object.fromEntries(
    componentes.map((c) => [
      c,
      deficitPorComunidade.reduce((s, d) => s + d[c], 0) / deficitPorComunidade.length,
    ]),
  );

  // ---- perfil e pontes de precedente, por comunidade
  const resumoComunidades = comunidades.map((membros, i) => {
    const perfil = componentes
      .map((c) => ({
        c,
        nome: indice.meta.componentes[c] ?? c,
        deficit:
          membros.reduce((s, n) => {
            const r = indice.entes[n].comps[c];
            return s + (r && r.t ? 1 - r.m / 100 : 0);
          }, 0) / membros.length,
      }))
      .sort((a, b) => b.deficit - a.deficit);

    /*
     * A ponte de precedente: um componente que quase todos falham e um ou dois
     * resolveram. Esse um é o precedente natural dos outros — mesma estrutura
     * de fragilidade, e já resolveu. É aqui que o grafo deixa de ser bonito e
     * passa a ser útil.
     */
    const pontes = [];
    for (const c of componentes) {
      const falham = membros.filter((n) => (indice.entes[n].comps[c]?.l ?? 0) > 0);
      const resolveram = membros.filter(
        (n) => (indice.entes[n].comps[c]?.l ?? 0) === 0 && (indice.entes[n].comps[c]?.t ?? 0) > 0,
      );
      if (falham.length >= 3 && resolveram.length >= 1 && resolveram.length <= 3) {
        pontes.push({
          componente: c,
          nome: indice.meta.componentes[c] ?? c,
          falham: falham.length,
          resolveram,
        });
      }
    }
    pontes.sort((a, b) => b.falham - a.falham || a.componente.localeCompare(b.componente));

    const eixoDe = (c) => {
      for (const n of membros) {
        const encontrado = (indice.entes[n].achados ?? []).find((a) => a.c === c);
        if (encontrado) return encontrado.eixo;
      }
      // O índice não carrega achados; deduz pelo prefixo do código.
      return { F: "Financiamento", G: "Governança", P: "Políticas públicas" }[c[0]] ?? "";
    };

    return {
      id: i,
      entes: membros,
      tamanho: membros.length,
      caracter: caracterizar(deficitPorComunidade[i], mediaPorComponente, indice.meta.componentes, eixoDe),
      contorno: casco(membros.map((n) => pos[n])),
      pontuacaoMedia:
        Math.round((membros.reduce((s, n) => s + indice.entes[n].mat, 0) / membros.length) * 10) /
        10,
      perfil: perfil.slice(0, 3).map((p) => ({
        c: p.c,
        nome: p.nome,
        deficit: Math.round(p.deficit * 100),
      })),
      pontes: pontes.slice(0, 3),
      // Uma comunidade pequena demais não sustenta generalização, e a interface
      // precisa poder dizer isso em vez de apresentar dois entes como padrão.
      generalizavel: membros.length >= MINIMO_PARA_COMUNIDADE,
    };
  });

  const grafo = {
    meta: {
      metrica: "cosseno sobre o vetor de déficit nos 15 componentes",
      vizinhos: K,
      comunidades: comunidades.length,
      gerado: new Date().toISOString().slice(0, 10),
      aviso:
        "Proximidade é semelhança de padrão de falha, não causa comum, contágio ou característica regional.",
    },
    viewBox: `0 0 ${LARGURA} ${ALTURA}`,
    nos: nomes.map((n) => ({
      nome: n,
      /*
       * Rótulo curto para o desenho. Estado vira sigla, capital mantém o nome
       * da cidade: assim "São Paulo (estado)" e "São Paulo (capital)" deixam de
       * colidir em dois rótulos idênticos — que era o efeito de simplesmente
       * remover o sufixo, e apagava justamente a distinção que o produto levou
       * uma etapa inteira para recuperar.
       */
      curto:
        indice.entes[n].tipo === "Município"
          ? n.replace(/ \(.*\)/, "")
          : (SIGLA[String(indice.entes[n].id ?? "").padStart(2, "0").slice(0, 2)] ?? n),
      x: Number(pos[n].x.toFixed(1)),
      y: Number(pos[n].y.toFixed(1)),
      comunidade: comunidadeDe[n],
      pontuacao: indice.entes[n].mat,
      tipo: indice.entes[n].tipo,
      pop: indice.entes[n].pop,
    })),
    arestas: arestas.map((e) => ({
      a: e.a,
      b: e.b,
      s: Number(e.s.toFixed(3)),
      interna: comunidadeDe[e.a] === comunidadeDe[e.b],
    })),
    comunidades: resumoComunidades,
  };

  writeFileSync(SAIDA, JSON.stringify(grafo), "utf8");

  console.log(`nós              ${grafo.nos.length}`);
  console.log(`arestas          ${grafo.arestas.length}`);
  console.log(`comunidades      ${comunidades.length}  (tamanhos: ${comunidades.map((c) => c.length).join(", ")})`);
  console.log(`grafo.json       ${(readFileSync(SAIDA).length / 1024).toFixed(0)} KB`);

  // ---- conferências
  const semComunidade = grafo.nos.filter((n) => n.comunidade == null);
  if (semComunidade.length) {
    console.error(`FALHA: ${semComunidade.length} entes sem comunidade`);
    process.exit(1);
  }
  const foraDaTela = grafo.nos.filter(
    (n) => n.x < 0 || n.y < 0 || n.x > LARGURA || n.y > ALTURA,
  );
  if (foraDaTela.length) {
    console.error(`FALHA: ${foraDaTela.length} nós fora da tela`);
    process.exit(1);
  }
  const orfas = grafo.arestas.filter(
    (e) => !grafo.nos.some((n) => n.nome === e.a) || !grafo.nos.some((n) => n.nome === e.b),
  );
  if (orfas.length) {
    console.error(`FALHA: ${orfas.length} arestas apontando para nó inexistente`);
    process.exit(1);
  }
  console.log("conferência      todo ente tem comunidade, todo nó cabe na tela, nenhuma aresta órfã");

  console.log("");
  for (const c of resumoComunidades) {
    const marca = c.generalizavel ? " " : "!";
    console.log(
      `${marca}G${c.id + 1} ${String(c.tamanho).padStart(2)} entes · ${String(c.pontuacaoMedia).padStart(5)}% · ` +
        c.perfil.map((p) => `${p.c} ${p.deficit}%`).join("  "),
    );
    for (const ponte of c.pontes) {
      console.log(`      ponte: ${ponte.componente} — ${ponte.falham} falham, ${ponte.resolveram.join(" e ")} resolveu`);
    }
  }
}

main();
