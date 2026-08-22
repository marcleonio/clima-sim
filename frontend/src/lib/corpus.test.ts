import { describe, expect, it } from "vitest";

import { buscarContexto, CORPUS } from "@/lib/corpus";
import { META } from "@/lib/dados";

/**
 * O corpus é a peça mais perigosa do agente: existe para sugerir causas, num
 * produto cuja regra é não afirmar causalidade. Os testes aqui defendem a
 * separação das prateleiras — o corte de data, a indexação por componente e a
 * procedência de cada trecho.
 */

describe("integridade do corpus", () => {
  it("nada posterior à extração da avaliação entra", () => {
    // Explicar uma avaliação de setembro de 2025 com documento de 2026 é
    // anacronismo: o auditor não tinha aquilo à frente quando avaliou.
    expect(CORPUS.meta.corteDeData).toBe(META.snapshot);
    for (const d of CORPUS.documentos) {
      expect(d.data.localeCompare(CORPUS.meta.corteDeData), d.id).toBeLessThanOrEqual(0);
    }
  });

  it("todo documento declara fonte, data e tipo", () => {
    for (const d of CORPUS.documentos) {
      expect(d.fonte, d.id).toBeTruthy();
      expect(d.data, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(CORPUS.meta.pesoPorTipo[d.tipo], `${d.id} tem tipo ${d.tipo}`).toBeGreaterThan(0);
    }
  });

  it("todo documento aponta para componente que existe na metodologia", () => {
    for (const d of CORPUS.documentos) {
      expect(d.componentes.length, d.id).toBeGreaterThan(0);
      for (const c of d.componentes) {
        expect(META.componentes[c], `${d.id} cita ${c}`).toBeDefined();
      }
    }
  });

  it("revisão por pares pesa mais que jornalismo", () => {
    // O agente não pode tratar blog e artigo revisado como equivalentes.
    expect(CORPUS.meta.pesoPorTipo["revisado-por-pares"]).toBeGreaterThan(
      CORPUS.meta.pesoPorTipo["jornalismo"]!,
    );
  });
});

describe("busca", () => {
  it("devolve apenas documentos do componente pedido", () => {
    for (const c of ["P5", "F1", "G3"]) {
      for (const r of buscarContexto(c, "risco")) {
        expect(r.documento.componentes, `${r.documento.id} para ${c}`).toContain(c);
      }
    }
  });

  it("componente sem documento devolve vazio, não erro", () => {
    expect(buscarContexto("XX", "qualquer coisa")).toEqual([]);
  });

  it("sem termo, ordena pelo peso da fonte em vez da ordem de arquivo", () => {
    const r = buscarContexto("P5", "", 3);
    expect(r.length).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i += 1) {
      expect(r[i - 1]!.pontuacao).toBeGreaterThanOrEqual(r[i]!.pontuacao);
    }
  });

  it("um termo do próprio documento o encontra", () => {
    const alvo = CORPUS.documentos.find((d) => d.componentes.includes("P5"));
    expect(alvo).toBeDefined();

    const r = buscarContexto("P5", "defesa civil desastre risco");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.pontuacao).toBeGreaterThan(0);
  });

  it("o trecho devolvido sai do texto do documento, sem paráfrase", () => {
    const r = buscarContexto("P5", "defesa civil");
    for (const achado of r) {
      const limpo = achado.trecho.replace(/^…\s*/, "").replace(/\s*…$/, "");
      expect(achado.documento.texto, achado.documento.id).toContain(limpo);
    }
  });

  it("respeita o limite pedido", () => {
    expect(buscarContexto("P5", "risco", 1).length).toBeLessThanOrEqual(1);
  });
});
