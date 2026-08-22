import { describe, expect, it } from "vitest";

import {
  codigoAchado,
  diagnosticoColisao,
  agruparPorComponente,
  mapaComponentes,
  referenciaPara,
  COMPONENTES_CRITICOS,
  filtrarEntes,
  hashDeterministico,
  normalizarTexto,
  ordenarPorPrioridade,
  protocoloDe,
  severidade,
  taxaLacuna,
  vereditoDe,
  amplitudeComponentes,
  type Achado,
  type Ente,
} from "@/lib/achados";

function achado(c: string, i = "A", extra: Partial<Achado> = {}): Achado {
  return {
    c,
    i,
    nome: `Componente ${c}`,
    eixo: "Políticas públicas",
    lei: "Lei nº 0.000/0000",
    txt: "Parecer técnico da auditoria.",
    ...extra,
  };
}

function ente(over: Partial<Ente> = {}): Ente {
  return {
    tipo: "Estado",
    id: 43,
    pop: 11_466_630,
    tot: 45,
    lac: 2,
    mat: 61.5,
    rank: 47,
    eixos: {},
    comps: {},
    achados: [],
    ...over,
  };
}

describe("taxaLacuna", () => {
  it("devolve o percentual de requisitos sem progresso", () => {
    expect(taxaLacuna(ente({ lac: 43, tot: 44 }))).toBeCloseTo(97.7, 1);
    expect(taxaLacuna(ente({ lac: 2, tot: 45 }))).toBeCloseTo(4.4, 1);
  });

  it("devolve 0 quando não há requisitos avaliados, em vez de NaN", () => {
    // Divisão por zero mostraria "NaN%" na tela — o ente sem avaliação vale 0.
    expect(taxaLacuna(ente({ lac: 0, tot: 0 }))).toBe(0);
  });
});

describe("severidade", () => {
  it("classifica como crítico a partir de 45%", () => {
    expect(severidade(97.7)).toBe("critico");
    expect(severidade(45)).toBe("critico");
  });

  it("classifica como atenção entre 20% e 45%", () => {
    expect(severidade(44.9)).toBe("atencao");
    expect(severidade(20)).toBe("atencao");
  });

  it("classifica como maduro abaixo de 20%", () => {
    expect(severidade(19.9)).toBe("maduro");
    expect(severidade(0)).toBe("maduro");
  });
});

describe("normalizarTexto", () => {
  it("remove acentos e caixa para permitir busca sem acento", () => {
    expect(normalizarTexto("São Paulo")).toBe("sao paulo");
    expect(normalizarTexto("Macapá")).toBe("macapa");
    expect(normalizarTexto("BELÉM")).toBe("belem");
  });
});

describe("filtrarEntes", () => {
  const nomes = ["São Paulo", "Belém", "Boa Vista", "Rio Grande do Sul", "Rio Grande do Norte"];

  it("encontra o ente mesmo sem o acento digitado", () => {
    expect(filtrarEntes(nomes, "sao paulo")).toEqual(["São Paulo"]);
    expect(filtrarEntes(nomes, "belem")).toEqual(["Belém"]);
  });

  it("encontra por trecho no meio do nome", () => {
    expect(filtrarEntes(nomes, "vista")).toEqual(["Boa Vista"]);
  });

  it("devolve todos os que casam, em ordem alfabética pt-BR", () => {
    expect(filtrarEntes(nomes, "rio grande")).toEqual([
      "Rio Grande do Norte",
      "Rio Grande do Sul",
    ]);
  });

  it("devolve lista vazia para busca em branco", () => {
    expect(filtrarEntes(nomes, "   ")).toEqual([]);
  });
});

describe("codigoAchado", () => {
  it("junta componente e item", () => {
    expect(codigoAchado(achado("P5", "A"))).toBe("P5A");
  });
});

describe("ordenarPorPrioridade", () => {
  it("coloca defesa civil e adaptação no topo, por serem os que salvam vidas", () => {
    const lista = [achado("G1"), achado("F2"), achado("P5"), achado("P2"), achado("F1")];
    const ordem = ordenarPorPrioridade(lista).map((a) => a.c);

    expect(ordem.slice(0, 2)).toEqual(["P5", "P2"]);
  });

  it("declara explicitamente quais componentes são críticos à vida", () => {
    expect(COMPONENTES_CRITICOS).toContain("P5");
    expect(COMPONENTES_CRITICOS).toContain("P2");
  });

  it("mantém ordem estável por código dentro do mesmo nível de prioridade", () => {
    const lista = [achado("G3", "B"), achado("G3", "A"), achado("G1", "A")];
    const ordem = ordenarPorPrioridade(lista).map(codigoAchado);

    expect(ordem).toEqual(["G1A", "G3A", "G3B"]);
  });

  it("não modifica o array recebido", () => {
    const lista = [achado("G1"), achado("P5")];
    const copia = [...lista];
    ordenarPorPrioridade(lista);

    expect(lista).toEqual(copia);
  });
});

describe("hashDeterministico", () => {
  it("produz o mesmo hash para a mesma entrada", () => {
    expect(hashDeterministico("Boa Vista|oficio")).toBe(hashDeterministico("Boa Vista|oficio"));
  });

  it("produz hashes diferentes para entradas diferentes", () => {
    expect(hashDeterministico("Boa Vista|oficio")).not.toBe(hashDeterministico("Boa Vista|lai"));
  });

  it("sempre devolve 8 caracteres hexadecimais", () => {
    for (const s of ["", "a", "Rio Grande do Sul|plano|P2B"]) {
      expect(hashDeterministico(s)).toMatch(/^[0-9a-f]{8}$/);
    }
  });
});

describe("protocoloDe", () => {
  it("é reproduzível: mesma semente devolve mesmo número e hash", () => {
    const a = protocoloDe("Boa Vista|oficio|P5A|2025-09-12");
    const b = protocoloDe("Boa Vista|oficio|P5A|2025-09-12");

    expect(a).toEqual(b);
  });

  it("muda quando o conjunto de achados muda", () => {
    const a = protocoloDe("Boa Vista|oficio|P5A|2025-09-12");
    const b = protocoloDe("Boa Vista|oficio|P5A,F1A|2025-09-12");

    expect(a.numero).not.toBe(b.numero);
  });

  it("formata o número como NNNN/AAAA", () => {
    expect(protocoloDe("qualquer").numero).toMatch(/^\d{4}\/\d{4}$/);
  });
});

describe("diagnosticoColisao", () => {
  const p5 = achado("P5", "A");
  const p2 = achado("P2", "B");
  const g1 = achado("G1", "A");

  it("isola os requisitos que colidem com risco de vida", () => {
    const d = diagnosticoColisao(ente({ achados: [g1, p5, p2], pop: 1000 }));

    expect(d.criticos.map((a) => a.c)).toEqual(["P5", "P2"]);
    expect(d.temColisao).toBe(true);
  });

  it("conta como expostas as pessoas do ente quando há colisão", () => {
    const d = diagnosticoColisao(ente({ achados: [p5], pop: 436591 }));

    expect(d.pessoasExpostas).toBe(436591);
  });

  it("não expõe ninguém quando não há lacuna crítica", () => {
    const d = diagnosticoColisao(ente({ achados: [g1], pop: 436591 }));

    expect(d.temColisao).toBe(false);
    expect(d.pessoasExpostas).toBe(0);
  });

  it("lida com ente sem população conhecida", () => {
    const d = diagnosticoColisao(ente({ achados: [p5], pop: null }));

    expect(d.temColisao).toBe(true);
    expect(d.pessoasExpostas).toBeNull();
  });
});

describe("referenciaPara", () => {
  const mapa = {
    P5A: [
      { ente: "Minas Gerais", tipo: "Estado", txt: "Plano de contingência integrado ao risco climático." },
      { ente: "Boa Vista", tipo: "Município", txt: "..." },
    ],
  };

  it("devolve quem já atingiu estágio avançado no mesmo requisito", () => {
    const refs = referenciaPara(mapa, { c: "P5", i: "A" });

    expect(refs.at(0)?.ente).toBe("Minas Gerais");
  });

  it("nunca sugere o próprio ente como referência para si mesmo", () => {
    const refs = referenciaPara(mapa, { c: "P5", i: "A" }, "Boa Vista");

    expect(refs.map((r) => r.ente)).not.toContain("Boa Vista");
  });

  it("devolve lista vazia quando ninguém resolveu o requisito", () => {
    expect(referenciaPara(mapa, { c: "G9", i: "Z" })).toEqual([]);
  });
});

describe("agruparPorComponente", () => {
  it("colapsa itens do mesmo componente num grupo só", () => {
    const grupos = agruparPorComponente([
      achado("P5", "A"),
      achado("P5", "B"),
      achado("F1", "A"),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos.at(0)?.itens).toHaveLength(2);
  });

  it("mantém os componentes de risco de vida no topo", () => {
    const grupos = agruparPorComponente([achado("G1"), achado("P5"), achado("P2")]);

    expect(grupos.map((g) => g.c)).toEqual(["P5", "P2", "G1"]);
  });

  it("preserva nome e eixo do componente no grupo", () => {
    const grupos = agruparPorComponente([achado("P5", "A", { nome: "Defesa civil", eixo: "Políticas públicas" })]);

    expect(grupos.at(0)?.nome).toBe("Defesa civil");
    expect(grupos.at(0)?.eixo).toBe("Políticas públicas");
  });

  it("devolve lista vazia sem achados", () => {
    expect(agruparPorComponente([])).toEqual([]);
  });
});

describe("mapaComponentes", () => {
  const nomes = { P5: "Defesa civil", F1: "Finanças" };
  const nacional = { P5: { m: 60, l: 30 }, F1: { m: 40, l: 50 } };

  it("devolve uma célula por componente avaliado, com nome oficial", () => {
    const celulas = mapaComponentes(
      { comps: { P5: { t: 3, l: 3, m: 0 }, F1: { t: 4, l: 0, m: 100 } } },
      nomes,
      nacional,
    );

    expect(celulas).toHaveLength(2);
    expect(celulas.find((c) => c.c === "P5")?.nome).toBe("Defesa civil");
  });

  it("calcula a diferença em relação à média nacional", () => {
    const celulas = mapaComponentes({ comps: { P5: { t: 3, l: 0, m: 75 } } }, nomes, nacional);

    expect(celulas.at(0)?.delta).toBe(15);
  });

  it("ordena do pior para o melhor, para o olho cair no problema", () => {
    const celulas = mapaComponentes(
      { comps: { P5: { t: 3, l: 3, m: 0 }, F1: { t: 4, l: 0, m: 100 } } },
      nomes,
      nacional,
    );

    expect(celulas.at(0)?.c).toBe("P5");
  });
});

// ------------------------------------------------------------------ veredito

describe("vereditoDe", () => {
  const base = {
    tipo: "Município",
    pop: 436_591,
    achados: [] as Achado[],
  };

  it("diz quantos requisitos ficaram sem ação, com o nome do ente", () => {
    const v = vereditoDe(
      "Boa Vista",
      { ...base, tot: 44, lac: 43, mat: 0.8, rank: 1 },
      49,
      46.9,
    );

    expect(v.titulo).toBe("43 de 44 itens sem ação demonstrada em Boa Vista.");
  });

  it("troca a contagem por uma afirmação limpa quando não há lacuna", () => {
    const v = vereditoDe(
      "Minas Gerais",
      { ...base, tipo: "Estado", tot: 45, lac: 0, mat: 83, rank: 49 },
      49,
      46.9,
    );

    expect(v.titulo).toBe("Nenhum item sem ação demonstrada em Minas Gerais.");
    expect(v.alerta).toBeNull();
  });

  it("trata o primeiro colocado como caso especial, sem dizer '1ª posição'", () => {
    const v = vereditoDe("Boa Vista", { ...base, tot: 44, lac: 43, mat: 0.8, rank: 1 }, 49, 46.9);

    expect(v.contexto).toContain("o ente mais frágil entre os 49 avaliados");
    expect(v.contexto).not.toContain("1ª posição");
  });

  it("situa o ente contra a média nacional, com direção", () => {
    const acima = vereditoDe("Acre", { ...base, tot: 45, lac: 2, mat: 71.9, rank: 40 }, 49, 46.9);
    expect(acima.contexto).toContain("25,0 pontos acima");

    const abaixo = vereditoDe("Macapá", { ...base, tot: 44, lac: 42, mat: 1.5, rank: 2 }, 49, 46.9);
    expect(abaixo.contexto).toContain("45,4 pontos abaixo");
  });

  it("alerta sobre requisitos de risco de vida sem afirmar risco físico", () => {
    const achados: Achado[] = [
      { c: "P5", i: "A", nome: "Defesa civil", eixo: "Políticas públicas", lei: "", txt: "" },
      { c: "P2", i: "B", nome: "Adaptação", eixo: "Políticas públicas", lei: "", txt: "" },
    ];
    const v = vereditoDe(
      "Boa Vista",
      { ...base, achados, tot: 44, lac: 43, mat: 0.8, rank: 1 },
      49,
      46.9,
    );

    expect(v.alerta).toContain("2 lacunas");
    expect(v.alerta).toContain("436.591 habitantes");
    // a formulação mede lacuna de governança, nunca risco físico
    expect(v.alerta).toContain("jurisdição");
    expect(v.alerta).not.toMatch(/risco de morrer|em risco|expostas/i);
  });

  it("omite a população quando ela é desconhecida", () => {
    const achados: Achado[] = [
      { c: "P5", i: "A", nome: "Defesa civil", eixo: "Políticas públicas", lei: "", txt: "" },
    ];
    const v = vereditoDe(
      "Ente sem população",
      { ...base, pop: null, achados, tot: 44, lac: 43, mat: 0.8, rank: 1 },
      49,
      46.9,
    );

    expect(v.alerta).toContain("1 lacuna");
    expect(v.alerta).not.toContain("habitantes");
  });

  it("carrega a severidade para a interface não recalcular", () => {
    expect(
      vereditoDe("Boa Vista", { ...base, tot: 44, lac: 43, mat: 0.8, rank: 1 }, 49, 46.9).severidade,
    ).toBe("critico");
    expect(
      vereditoDe("Minas Gerais", { ...base, tot: 45, lac: 0, mat: 83, rank: 49 }, 49, 46.9)
        .severidade,
    ).toBe("maduro");
  });
});

describe("amplitudeComponentes", () => {
  it("mede a distância entre o melhor e o pior componente", () => {
    expect(
      amplitudeComponentes({
        G1: { t: 3, l: 0, m: 88.9 },
        F3: { t: 2, l: 1, m: 16.7 },
        P5: { t: 3, l: 0, m: 55.6 },
      }),
    ).toBeCloseTo(72.2, 1);
  });

  it("devolve zero quando todos os componentes valem o mesmo", () => {
    expect(
      amplitudeComponentes({
        G1: { t: 3, l: 3, m: 0 },
        F3: { t: 2, l: 2, m: 0 },
      }),
    ).toBe(0);
  });

  it("devolve zero quando não há o que comparar", () => {
    expect(amplitudeComponentes({})).toBe(0);
    expect(amplitudeComponentes({ G1: { t: 3, l: 0, m: 88.9 } })).toBe(0);
  });
});
