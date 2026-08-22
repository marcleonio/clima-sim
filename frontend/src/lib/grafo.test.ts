import { describe, expect, it } from "vitest";

import { ENTES } from "@/lib/dados";
import {
  comunidadeDe,
  GRAFO,
  listar,
  noDe,
  pontesPara,
  vizinhosDe,
} from "@/lib/grafo";

/**
 * O grafo é a peça mais fácil de se enganar do produto: uma figura bonita
 * convida o leitor a preencher com causalidade o que a métrica não diz. Os
 * testes aqui defendem duas coisas — a integridade estrutural (nenhum nó
 * órfão, nenhuma aresta apontando para o vazio) e o significado (uma ponte de
 * precedente só vale se quem resolveu de fato resolveu).
 */

describe("integridade do grafo", () => {
  it("todo ente do índice está no grafo, e nada além disso", () => {
    const noGrafo = new Set(GRAFO.nos.map((n) => n.nome));
    const noIndice = new Set(Object.keys(ENTES));

    expect(noGrafo.size).toBe(noIndice.size);
    for (const nome of noIndice) expect(noGrafo, nome).toContain(nome);
  });

  it("nenhuma aresta aponta para um ente que não existe", () => {
    const existe = new Set(GRAFO.nos.map((n) => n.nome));
    for (const e of GRAFO.arestas) {
      expect(existe, e.a).toContain(e.a);
      expect(existe, e.b).toContain(e.b);
      expect(e.a, "aresta de um ente para ele mesmo").not.toBe(e.b);
    }
  });

  it("todo ente pertence a exatamente uma comunidade", () => {
    for (const no of GRAFO.nos) {
      const pertence = GRAFO.comunidades.filter((c) => c.entes.includes(no.nome));
      expect(pertence, no.nome).toHaveLength(1);
      expect(pertence[0]!.id).toBe(no.comunidade);
    }
  });

  it("todo nó cabe na tela declarada", () => {
    const [, , largura, altura] = GRAFO.viewBox.split(" ").map(Number);
    for (const n of GRAFO.nos) {
      expect(n.x, n.nome).toBeGreaterThanOrEqual(0);
      expect(n.y, n.nome).toBeGreaterThanOrEqual(0);
      expect(n.x, n.nome).toBeLessThanOrEqual(largura!);
      expect(n.y, n.nome).toBeLessThanOrEqual(altura!);
    }
  });

  it("a pontuação de cada nó bate com a do índice", () => {
    for (const n of GRAFO.nos) {
      expect(n.pontuacao, n.nome).toBe(ENTES[n.nome]!.mat);
    }
  });

  it("o tamanho declarado da comunidade bate com a lista de entes", () => {
    for (const c of GRAFO.comunidades) {
      expect(c.tamanho, `G${c.id + 1}`).toBe(c.entes.length);
    }
  });

  it("marca como não generalizável a comunidade pequena demais", () => {
    for (const c of GRAFO.comunidades) {
      expect(c.generalizavel, `G${c.id + 1}`).toBe(c.tamanho >= 3);
    }
  });
});

describe("pontes de precedente", () => {
  it("quem consta como tendo resolvido de fato não tem item sem progresso ali", () => {
    // É o teste que impede o produto de mandar alguém perguntar a quem também
    // não fez. Uma ponte errada aqui vira um ofício errado lá na frente.
    for (const c of GRAFO.comunidades) {
      for (const p of c.pontes) {
        for (const quem of p.resolveram) {
          const resumo = ENTES[quem]!.comps[p.componente];
          expect(resumo, `${quem} / ${p.componente}`).toBeDefined();
          expect(resumo!.l, `${quem} deveria ter resolvido ${p.componente}`).toBe(0);
          expect(resumo!.t, `${quem} precisa ter sido avaliado em ${p.componente}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("quem consta como falhando de fato falha", () => {
    for (const c of GRAFO.comunidades) {
      for (const p of c.pontes) {
        const falham = c.entes.filter((n) => (ENTES[n]!.comps[p.componente]?.l ?? 0) > 0);
        expect(falham.length, `${p.componente} em G${c.id + 1}`).toBe(p.falham);
      }
    }
  });

  it("uma ponte só existe quando a maioria falha e a minoria resolveu", () => {
    for (const c of GRAFO.comunidades) {
      for (const p of c.pontes) {
        expect(p.falham, "ponte com pouca gente falhando não é padrão").toBeGreaterThanOrEqual(3);
        expect(p.resolveram.length, "se muitos resolveram, não é precedente escasso").toBeLessThanOrEqual(3);
        expect(p.resolveram.length).toBeGreaterThan(0);
      }
    }
  });

  it("pontesPara nunca devolve o próprio ente como precedente de si mesmo", () => {
    for (const no of GRAFO.nos) {
      const resumo = ENTES[no.nome]!;
      const pontes = pontesPara(no.nome, (c) => (resumo.comps[c]?.l ?? 0) > 0);
      for (const p of pontes) {
        expect(p.resolveram, no.nome).not.toContain(no.nome);
      }
    }
  });

  it("pontesPara só devolve componente em que o ente realmente está sem progresso", () => {
    for (const no of GRAFO.nos.slice(0, 20)) {
      const resumo = ENTES[no.nome]!;
      for (const p of pontesPara(no.nome, (c) => (resumo.comps[c]?.l ?? 0) > 0)) {
        expect(resumo.comps[p.componente]!.l, `${no.nome} / ${p.componente}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("consultas", () => {
  it("acha o nó e a comunidade de um ente conhecido", () => {
    expect(noDe("Acre")?.nome).toBe("Acre");
    expect(comunidadeDe("Acre")?.entes).toContain("Acre");
  });

  it("devolve nada para ente inexistente, sem estourar", () => {
    expect(noDe("Xanadu")).toBeUndefined();
    expect(comunidadeDe("Xanadu")).toBeUndefined();
    expect(pontesPara("Xanadu", () => true)).toEqual([]);
  });

  it("os vizinhos vêm do mais parecido ao menos", () => {
    const v = vizinhosDe("Acre");
    expect(v.length).toBeGreaterThan(0);
    for (let i = 1; i < v.length; i += 1) {
      expect(v[i - 1]!.semelhanca).toBeGreaterThanOrEqual(v[i]!.semelhanca);
    }
    expect(v.map((x) => x.nome)).not.toContain("Acre");
  });
});

describe("listar", () => {
  it("usa vírgula em tudo menos no último", () => {
    expect(listar([])).toBe("");
    expect(listar(["Bahia"])).toBe("Bahia");
    expect(listar(["Bahia", "Pará"])).toBe("Bahia e Pará");
    expect(listar(["Bahia", "Pará", "Goiás"])).toBe("Bahia, Pará e Goiás");
  });
});
