import { describe, expect, it } from "vitest";

import type { MapaReferencias } from "@/lib/achados";
import {
  alavancagemDe,
  CRITERIOS,
  descreverPesos,
  listaDeAcao,
  normalizarPopulacao,
  precedenteDe,
  PESOS,
  priorizarComponente,
  VINCULO_NORMATIVO,
  type EnteParaPriorizar,
} from "@/lib/prioridade";

const NOMES = {
  P5: "Defesa civil e risco de desastre",
  F3: "Mobilização de investimentos privados",
  G1: "Quadro legal e regulatório",
};

const REFERENCIAS: MapaReferencias = {
  P5A: [{ ente: "Curitiba", tipo: "Município", txt: "Plano de contingência com simulados." }],
  P5B: [{ ente: "Acre", tipo: "Estado", txt: "Sistema de alerta integrado." }],
  P5C: [],
  F3A: [],
};

/** Boa Vista: pequena, tudo zerado. */
const BOA_VISTA: EnteParaPriorizar = {
  nome: "Boa Vista",
  tipo: "Município",
  pop: 436_591,
  comps: {
    P5: { t: 3, l: 3, m: 0, d: [3, 0, 0, 0] },
    F3: { t: 2, l: 2, m: 0, d: [2, 0, 0, 0] },
  },
};

/** São Paulo capital: enorme, quase tudo resolvido, uma lacuna em andamento. */
const SAO_PAULO: EnteParaPriorizar = {
  nome: "São Paulo (capital)",
  tipo: "Município",
  pop: 12_396_372,
  comps: {
    P5: { t: 3, l: 1, m: 55.6, d: [1, 1, 1, 0] },
  },
};

describe("normalizarPopulacao", () => {
  it("usa escala logarítmica para o maior ente não decidir a lista sozinho", () => {
    const boaVista = normalizarPopulacao(436_591);
    const saoPaulo = normalizarPopulacao(46_649_132);

    expect(saoPaulo).toBe(1);
    // Em escala linear São Paulo seria 107× Boa Vista e afogaria todo o resto
    // do modelo; em log a razão cai para menos de 1,4×.
    expect(46_649_132 / 436_591).toBeGreaterThan(100);
    expect(saoPaulo / boaVista).toBeLessThan(1.4);
    expect(boaVista).toBeLessThan(saoPaulo);
  });

  it("trata população ausente ou inválida como zero, sem NaN", () => {
    expect(normalizarPopulacao(null)).toBe(0);
    expect(normalizarPopulacao(0)).toBe(0);
    expect(normalizarPopulacao(-10)).toBe(0);
  });
});

describe("alavancagemDe", () => {
  it("mede quanto do componente já saiu do zero", () => {
    // 1 inicial + 1 intermediário de 3 requisitos.
    expect(alavancagemDe([1, 1, 1, 0], 3)).toBeCloseTo(2 / 3, 5);
  });

  it("é zero quando nada saiu do zero", () => {
    expect(alavancagemDe([3, 0, 0, 0], 3)).toBe(0);
  });

  it("não conta o que já está no topo — avançado não é alavancagem", () => {
    expect(alavancagemDe([0, 0, 0, 3], 3)).toBe(0);
  });

  it("aguenta distribuição ausente", () => {
    expect(alavancagemDe(undefined, 3)).toBe(0);
    expect(alavancagemDe([1, 1, 0, 0], 0)).toBe(0);
  });
});

describe("precedenteDe", () => {
  it("mede a fração de itens com prática documentada em outro ente", () => {
    // P5 tem 3 itens no mapa; 2 têm precedente.
    expect(precedenteDe(REFERENCIAS, "P5")).toBeCloseTo(2 / 3, 5);
  });

  it("não conta o próprio ente como precedente de si mesmo", () => {
    expect(precedenteDe(REFERENCIAS, "P5", "Acre")).toBeCloseTo(1 / 3, 5);
  });

  it("é zero quando não há precedente nenhum", () => {
    expect(precedenteDe(REFERENCIAS, "F3")).toBe(0);
    expect(precedenteDe(REFERENCIAS, "G1")).toBe(0);
  });
});

describe("priorizarComponente", () => {
  it("decompõe o índice: a soma das contribuições é o próprio IPA", () => {
    const p = priorizarComponente(
      BOA_VISTA,
      "P5",
      NOMES.P5,
      REFERENCIAS,
      PESOS.fiscalizacao.pesos,
    );

    const soma = Object.values(p.contribuicoes).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(p.ipa, 3);
  });

  it("mantém o valor bruto de cada critério ao lado da contribuição", () => {
    const p = priorizarComponente(
      BOA_VISTA,
      "P5",
      NOMES.P5,
      REFERENCIAS,
      PESOS.fiscalizacao.pesos,
    );

    expect(p.criterios.deficit).toBe(1); // maturidade 0 → déficit total
    expect(p.criterios.normativo).toBe(VINCULO_NORMATIVO["P5"]);
    expect(p.criterios.alavancagem).toBe(0); // nada saiu do zero
    // contribuição = valor × peso
    expect(p.contribuicoes.deficit).toBeCloseTo(1 * PESOS.fiscalizacao.pesos.deficit, 4);
  });

  it("produz IPA entre 0 e 1 quando os pesos somam 1", () => {
    for (const perfil of Object.values(PESOS)) {
      const soma = Object.values(perfil.pesos).reduce((a, b) => a + b, 0);
      expect(soma).toBeCloseTo(1, 6);

      const p = priorizarComponente(BOA_VISTA, "P5", NOMES.P5, REFERENCIAS, perfil.pesos);
      expect(p.ipa).toBeGreaterThanOrEqual(0);
      expect(p.ipa).toBeLessThanOrEqual(1);
    }
  });

  it("não quebra em componente que o ente não tem", () => {
    const p = priorizarComponente(BOA_VISTA, "G1", NOMES.G1, REFERENCIAS, PESOS.fiscalizacao.pesos);

    expect(Number.isFinite(p.ipa)).toBe(true);
    expect(p.total).toBe(0);
    expect(p.lacunas).toBe(0);
  });
});

describe("listaDeAcao", () => {
  const entes = [BOA_VISTA, SAO_PAULO];

  it("descarta componentes sem lacuna — não se prioriza o que não tem o que corrigir", () => {
    const semLacuna: EnteParaPriorizar = {
      nome: "Minas Gerais",
      tipo: "Estado",
      pop: 20_000_000,
      comps: { P5: { t: 3, l: 0, m: 100, d: [0, 0, 0, 3] } },
    };

    expect(listaDeAcao([semLacuna], NOMES, REFERENCIAS, "fiscalizacao")).toHaveLength(0);
  });

  it("ordena por IPA decrescente", () => {
    const lista = listaDeAcao(entes, NOMES, REFERENCIAS, "fiscalizacao");

    for (let i = 1; i < lista.length; i += 1) {
      expect(lista[i - 1]!.ipa).toBeGreaterThanOrEqual(lista[i]!.ipa);
    }
  });

  it("os dois perfis produzem listas diferentes — é o ponto do modelo", () => {
    const fiscal = listaDeAcao(entes, NOMES, REFERENCIAS, "fiscalizacao");
    const politica = listaDeAcao(entes, NOMES, REFERENCIAS, "politica");

    const chave = (l: typeof fiscal) => l.map((p) => `${p.ente}/${p.componente}`).join(",");
    expect(chave(fiscal)).not.toBe(chave(politica));
  });

  it("no perfil de política pública, o 'quase lá' sobe", () => {
    // São Paulo/P5 tem 2 de 3 requisitos já em movimento; Boa Vista/P5 tem 0.
    // Sob o perfil de política pública, alavancagem pesa 0,30.
    const politica = listaDeAcao(entes, NOMES, REFERENCIAS, "politica");
    const sp = politica.find((p) => p.ente.startsWith("São Paulo"))!;
    const bv = politica.find((p) => p.ente === "Boa Vista" && p.componente === "P5")!;

    expect(sp.contribuicoes.alavancagem).toBeGreaterThan(bv.contribuicoes.alavancagem);
  });

  it("é estável: a mesma entrada devolve exatamente a mesma ordem", () => {
    const a = listaDeAcao(entes, NOMES, REFERENCIAS, "fiscalizacao");
    const b = listaDeAcao([...entes].reverse(), NOMES, REFERENCIAS, "fiscalizacao");

    expect(a.map((p) => `${p.ente}/${p.componente}`)).toEqual(
      b.map((p) => `${p.ente}/${p.componente}`),
    );
  });

  it("respeita o limite pedido", () => {
    expect(listaDeAcao(entes, NOMES, REFERENCIAS, "fiscalizacao", 1)).toHaveLength(1);
    // limite 0 devolve tudo
    expect(listaDeAcao(entes, NOMES, REFERENCIAS, "fiscalizacao", 0).length).toBeGreaterThan(1);
  });

  it("aceita pesos avulsos, para o controle deslizante da interface", () => {
    const soDeficit = {
      deficit: 1,
      exposicao: 0,
      normativo: 0,
      alavancagem: 0,
      precedente: 0,
    };
    const lista = listaDeAcao(entes, NOMES, REFERENCIAS, soDeficit);

    expect(lista[0]!.ipa).toBe(lista[0]!.criterios.deficit);
  });
});

describe("VINCULO_NORMATIVO", () => {
  it("cobre os 15 componentes da metodologia", () => {
    expect(Object.keys(VINCULO_NORMATIVO)).toHaveLength(15);
  });

  it("mantém todos os valores dentro da faixa", () => {
    for (const [c, v] of Object.entries(VINCULO_NORMATIVO)) {
      expect(v, c).toBeGreaterThanOrEqual(0);
      expect(v, c).toBeLessThanOrEqual(1);
    }
  });

  it("põe defesa civil no topo — é o único com obrigação legal autoaplicável", () => {
    expect(VINCULO_NORMATIVO["P5"]).toBe(1);
    expect(VINCULO_NORMATIVO["P5"]).toBeGreaterThan(VINCULO_NORMATIVO["F3"]!);
  });
});

describe("descreverPesos", () => {
  it("registra os pesos usados, para a peça poder citar", () => {
    const texto = descreverPesos(PESOS.fiscalizacao.pesos);

    for (const { nome } of CRITERIOS) expect(texto).toContain(nome);
    expect(texto).toContain("0,30");
  });
});
