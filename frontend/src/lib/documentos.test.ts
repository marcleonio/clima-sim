import { describe, expect, it } from "vitest";

import type { Achado, Ente } from "@/lib/achados";
import { gerarDocumento, TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos";

const ACHADO_DEFESA_CIVIL: Achado = {
  c: "P5",
  i: "A",
  nome: "Defesa civil e risco de desastre",
  eixo: "Políticas públicas",
  lei: "Política Nacional de Proteção e Defesa Civil (Lei 12.608/2012)",
  txt: "Não há nada à nível municipal que leve em consideração os riscos climáticos.",
};

const ACHADO_FINANCAS: Achado = {
  c: "F1",
  i: "A",
  nome: "Finanças e gastos públicos",
  eixo: "Financiamento",
  lei: "Lei nº 14.133/2021. Lei de Licitações e Contratos Administrativos",
  txt: "Não há previsão específica no PPA para enfrentamento das mudanças climáticas.",
};

const ENTE: Ente = {
  tipo: "Município",
  id: 1400100,
  pop: 436_591,
  tot: 44,
  lac: 43,
  mat: 8.3,
  rank: 1,
  eixos: {},
  comps: {},
  achados: [ACHADO_DEFESA_CIVIL, ACHADO_FINANCAS],
};

const CONTEXTO = {
  nomeEnte: "Boa Vista",
  ente: ENTE,
  achados: [ACHADO_DEFESA_CIVIL],
  snapshot: "2025-09-12",
  versao: "Versão de Avaliação 2025",
  emitidoEm: new Date("2026-08-22T12:00:00Z"),
};

describe("TIPOS_DOCUMENTO", () => {
  it("oferece os quatro caminhos de encaminhamento", () => {
    expect(TIPOS_DOCUMENTO.map((t) => t.id).sort()).toEqual(["lai", "legis", "oficio", "plano"]);
  });

  it("descreve remetente e destinatário de cada caminho", () => {
    for (const tipo of TIPOS_DOCUMENTO) {
      expect(tipo.fluxo.length).toBeGreaterThan(0);
      expect(tipo.nome.length).toBeGreaterThan(0);
      expect(tipo.descricao.length).toBeGreaterThan(0);
    }
  });
});

describe("gerarDocumento", () => {
  it("é determinístico: mesma entrada devolve mesmo protocolo e hash", () => {
    const a = gerarDocumento("oficio", CONTEXTO);
    const b = gerarDocumento("oficio", CONTEXTO);

    expect(a.protocolo).toEqual(b.protocolo);
  });

  it("muda o protocolo quando muda o tipo de documento", () => {
    const oficio = gerarDocumento("oficio", CONTEXTO);
    const lai = gerarDocumento("lai", CONTEXTO);

    expect(oficio.protocolo.numero).not.toBe(lai.protocolo.numero);
  });

  it("muda o protocolo quando muda o conjunto de achados", () => {
    const um = gerarDocumento("oficio", CONTEXTO);
    const dois = gerarDocumento("oficio", { ...CONTEXTO, achados: [ACHADO_DEFESA_CIVIL, ACHADO_FINANCAS] });

    expect(um.protocolo.numero).not.toBe(dois.protocolo.numero);
  });

  it.each(TIPOS_DOCUMENTO.map((t) => t.id))("o documento %s cita a base normativa do achado", (id) => {
    const doc = gerarDocumento(id as TipoDocumento, CONTEXTO);

    expect(doc.achados.at(0)?.lei).toContain("Lei 12.608/2012");
  });

  it.each(TIPOS_DOCUMENTO.map((t) => t.id))("o documento %s cita a fonte oficial dos dados", (id) => {
    const doc = gerarDocumento(id as TipoDocumento, CONTEXTO);

    expect(doc.fonte).toContain("Painel ClimaBrasil");
    expect(doc.fonte).toContain("2025-09-12");
  });

  it.each(TIPOS_DOCUMENTO.map((t) => t.id))("o documento %s tem título e ao menos um parágrafo", (id) => {
    const doc = gerarDocumento(id as TipoDocumento, CONTEXTO);

    expect(doc.titulo.length).toBeGreaterThan(0);
    expect(doc.paragrafos.length).toBeGreaterThan(0);
  });

  it("o ofício exige prazo de resposta e lista de quesitos", () => {
    const doc = gerarDocumento("oficio", CONTEXTO);
    const texto = doc.paragrafos.join(" ");

    expect(texto).toMatch(/15 \(quinze\) dias/);
    expect(doc.quesitos.length).toBeGreaterThanOrEqual(3);
  });

  it("o requerimento LAI se apoia na Lei 12.527/2011", () => {
    const doc = gerarDocumento("lai", CONTEXTO);
    const texto = [doc.destinatario, doc.fundamento, ...doc.paragrafos].join(" ");

    expect(texto).toContain("12.527/2011");
  });

  it("o plano de providências abre campos para causa, responsável e prazo", () => {
    const doc = gerarDocumento("plano", CONTEXTO);

    expect(doc.preencherCampos).toBe(true);
    expect(doc.quesitos.join(" ")).toMatch(/respons[áa]vel/i);
  });

  it("o requerimento legislativo justifica com o número de lacunas e a população", () => {
    const doc = gerarDocumento("legis", CONTEXTO);
    const texto = doc.paragrafos.join(" ");

    expect(texto).toContain("43");
    expect(texto).toMatch(/436\.591/);
  });

  it("usa todos os achados do ente quando nenhum foi selecionado", () => {
    const doc = gerarDocumento("oficio", { ...CONTEXTO, achados: [] });

    expect(doc.achados).toHaveLength(2);
  });

  it("formata percentuais no padrão brasileiro, com vírgula", () => {
    const doc = gerarDocumento("oficio", CONTEXTO);
    const texto = doc.paragrafos.join(" ");

    expect(texto).toContain("97,7%");
    expect(texto).not.toContain("97.7%");
  });

  it("ordena os achados por prioridade, colocando risco de vida primeiro", () => {
    const doc = gerarDocumento("oficio", {
      ...CONTEXTO,
      achados: [ACHADO_FINANCAS, ACHADO_DEFESA_CIVIL],
    });

    expect(doc.achados.at(0)?.c).toBe("P5");
  });
});
