import { describe, expect, it } from "vitest";

import {
  descreverTrajetoria,
  posicaoProjetada,
  projetar,
  type EnteParaTrajetoria,
} from "@/lib/trajetoria";

/** Boa Vista: 43 de 44 requisitos sem progresso, índice 0,8. */
const BOA_VISTA: EnteParaTrajetoria = { tot: 44, lac: 43, mat: 0.8 };
/** Acre: 2 de 45, índice 71,9. */
const ACRE: EnteParaTrajetoria = { tot: 45, lac: 2, mat: 71.9 };

describe("projetar", () => {
  it("calcula o ganho pela escala oficial, sem modelo", () => {
    // 6 requisitos subindo 1 de 3 degraus, sobre 44 avaliados:
    // 100 × 6 × (1/3) / 44 = 4,545 pontos.
    const t = projetar(BOA_VISTA, 6, 1);

    expect(t.atual).toBe(0.8);
    expect(t.projetado).toBeCloseTo(5.3, 1);
    expect(t.ganho).toBeCloseTo(4.5, 1);
  });

  it("um requisito que sai de 'Sem progresso' deixa de ser lacuna", () => {
    const t = projetar(BOA_VISTA, 6, 1);

    expect(t.requisitos).toBe(6);
    expect(t.lacunasRestantes).toBe(37);
    expect(t.destino).toBe("Estágio inicial");
  });

  it("subir mais degraus rende proporcionalmente mais", () => {
    const tres = projetar(BOA_VISTA, 6, 3);

    // 100 × 6 × (3/3) / 44 = 13,64 pontos — o triplo exato do ganho de um
    // degrau, comparado contra o valor exato e não contra o já arredondado.
    expect(tres.ganho).toBeCloseTo(13.6, 1);
    expect(tres.destino).toBe("Estágio avançado");
  });

  it("não move mais requisitos do que o ente tem lacunas", () => {
    // Pedir 40 num ente com 2 lacunas não é cenário, é erro.
    const t = projetar(ACRE, 40, 1);

    expect(t.requisitos).toBe(2);
    expect(t.lacunasRestantes).toBe(0);
  });

  it("não passa de 100 nem aceita degrau acima do topo da escala", () => {
    const t = projetar({ tot: 10, lac: 10, mat: 0 }, 10, 9);

    expect(t.degraus).toBe(3);
    expect(t.projetado).toBe(100);
  });

  it("sem movimento, nada muda", () => {
    const t = projetar(BOA_VISTA, 0, 1);

    expect(t.projetado).toBe(t.atual);
    expect(t.ganho).toBe(0);
    expect(t.lacunasRestantes).toBe(43);
  });

  it("aguenta ente sem requisito avaliado sem dividir por zero", () => {
    const t = projetar({ tot: 0, lac: 0, mat: 0 }, 5, 1);

    expect(Number.isFinite(t.projetado)).toBe(true);
    expect(t.projetado).toBe(0);
  });

  it("ignora pedido negativo em vez de subtrair pontos", () => {
    const t = projetar(BOA_VISTA, -5, 1);

    expect(t.requisitos).toBe(0);
    expect(t.ganho).toBe(0);
  });
});

describe("posicaoProjetada", () => {
  // Três outros entes com taxas de 90%, 50% e 10%.
  const OUTROS = [90, 50, 10];

  it("recalcula a posição pela taxa de lacuna nova", () => {
    // Boa Vista sai de 43/44 (97,7%) para 7/44 (15,9%): só o de 90% e o de 50%
    // ficam piores, então ela cai para a 3ª posição.
    const t = projetar(BOA_VISTA, 36, 1);
    const p = posicaoProjetada(BOA_VISTA, t, OUTROS, 1);

    expect(p.atual).toBe(1);
    expect(p.projetada).toBe(3);
    expect(p.total).toBe(4);
  });

  it("mantém a posição quando o movimento não é suficiente para ultrapassar ninguém", () => {
    const t = projetar(BOA_VISTA, 1, 1);
    const p = posicaoProjetada(BOA_VISTA, t, OUTROS, 1);

    expect(p.projetada).toBe(1);
    expect(p.ganho).toBe(0);
  });
});

describe("descreverTrajetoria", () => {
  it("descreve o movimento em uma frase verificável", () => {
    const t = projetar(BOA_VISTA, 6, 1);
    const frase = descreverTrajetoria("Boa Vista", t);

    expect(frase).toContain("6 requisitos saírem");
    expect(frase).toContain("“Sem progresso”");
    expect(frase).toContain("“Estágio inicial”");
    expect(frase).toContain("0,8%");
    expect(frase).toContain("5,3%");
  });

  it("acrescenta a mudança de posição quando ela acontece", () => {
    const t = projetar(BOA_VISTA, 36, 1);
    const p = posicaoProjetada(BOA_VISTA, t, [90, 50, 10], 1);

    expect(descreverTrajetoria("Boa Vista", t, p)).toContain("da 1ª para a 3ª posição");
  });

  it("concorda o singular", () => {
    expect(descreverTrajetoria("Acre", projetar(ACRE, 1, 1))).toContain("1 requisito sair");
  });

  it("não promete nada quando não há seleção", () => {
    const frase = descreverTrajetoria("Boa Vista", projetar(BOA_VISTA, 0, 1));

    expect(frase).toContain("Nenhum requisito selecionado");
    expect(frase).toContain("0,8%");
  });

  it("nunca menciona dinheiro — o produto não tem esse dado", () => {
    const t = projetar(BOA_VISTA, 6, 1);
    const p = posicaoProjetada(BOA_VISTA, t, [90, 50, 10], 1);

    expect(descreverTrajetoria("Boa Vista", t, p)).not.toMatch(/R\$|custo|investimento|orçament/i);
  });
});
