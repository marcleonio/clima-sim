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

// ------------------------------------------------------- template da peça

/** Contexto com os dois achados do ente, para o agrupamento ter o que agrupar. */
const TODOS = { ...CONTEXTO, achados: [] as Achado[] };

describe("template da peça", () => {
  it("monta um quadro-resumo com o que a primeira página precisa responder", () => {
    const doc = gerarDocumento("oficio", { ...TODOS, totalDeEntes: 51 });

    expect(doc.quadro.achados).toBe(doc.achados.length);
    expect(doc.quadro.requisitos).toBe(ENTE.tot);
    expect(doc.quadro.posicao).toBe(ENTE.rank);
    expect(doc.quadro.totalDeEntes).toBe(51);
    expect(doc.quadro.maturidade).toBe(ENTE.mat);
    expect(doc.quadro.populacao).toBe(ENTE.pop);
  });

  it("conta separadamente os achados de risco de vida", () => {
    // P5 é defesa civil; F1 não é.
    const doc = gerarDocumento("oficio", TODOS);

    expect(doc.quadro.achados).toBe(2);
    expect(doc.quadro.riscoDeVida).toBe(1);
  });

  it("agrupa o corpo por eixo, sem perder nem repetir achado", () => {
    const doc = gerarDocumento("oficio", TODOS);

    expect(doc.blocos.map((b) => b.eixo).sort()).toEqual(["Financiamento", "Políticas públicas"]);
    expect(doc.blocos.flatMap((b) => b.achados)).toHaveLength(doc.achados.length);
  });

  it("o quadro por eixo bate com o corpo", () => {
    const doc = gerarDocumento("oficio", TODOS);

    for (const { eixo, qtd } of doc.quadro.porEixo) {
      expect(doc.blocos.find((b) => b.eixo === eixo)?.achados, eixo).toHaveLength(qtd);
    }
  });

  it("cada fluxo tem seu timbre e seu campo de assinatura", () => {
    expect(gerarDocumento("oficio", TODOS).timbre.assinatura).toMatch(/autoridade/i);
    expect(gerarDocumento("plano", TODOS).timbre.assinatura).toMatch(/respons[áa]vel/i);
    expect(gerarDocumento("legis", TODOS).timbre.origem).toMatch(/legislativo/i);
    expect(gerarDocumento("lai", TODOS).timbre.origem).toMatch(/solicitante/i);
  });

  it("explica o que o código de conferência prova, sem chamá-lo de criptográfico", () => {
    const doc = gerarDocumento("oficio", TODOS);

    expect(doc.conferencia).toContain(doc.protocolo.sha);
    expect(doc.conferencia).toContain("2025-09-12");
    expect(doc.conferencia).toMatch(/reproduza/i);
    // djb2 não é criptografia e o texto não pode sugerir que seja
    expect(doc.conferencia).not.toMatch(/SHA|criptogr|assinatura digital/i);
  });

  it("cita o universo da avaliação quando ele é conhecido", () => {
    const com = gerarDocumento("oficio", { ...TODOS, totalDeEntes: 51 });
    expect(com.paragrafos.join(" ")).toContain("entre os 51 entes avaliados");

    const sem = gerarDocumento("oficio", TODOS);
    expect(sem.paragrafos.join(" ")).toContain("entre os entes avaliados");
  });

  it("carrega a trajetória quando ela é fornecida, e nada quando não é", () => {
    const frase = "Se 2 requisitos saírem de Sem progresso para Estágio inicial…";

    expect(gerarDocumento("oficio", { ...TODOS, trajetoria: frase }).trajetoria).toBe(frase);
    expect(gerarDocumento("oficio", TODOS).trajetoria).toBeNull();
  });

  it("não calcula projeção por conta própria — isso mora em lib/trajetoria", () => {
    expect(gerarDocumento("oficio", TODOS).trajetoria).toBeNull();
  });
});
