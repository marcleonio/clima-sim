import { describe, expect, it } from "vitest";

import { DESCRICOES, esquemas, ferramentas, TOTAL_DE_FERRAMENTAS } from "@/lib/agente/ferramentas";
import { ENTES, META } from "@/lib/dados";

/**
 * As ferramentas são a fonte de verdade do agente: o modelo só redige o que
 * elas devolvem. Se elas mentirem, ele mente — com a autoridade de um produto
 * de controle externo. Por isso o teste aqui é mais duro que o de uma função
 * comum.
 */

describe("contrato das ferramentas", () => {
  it("toda ferramenta tem esquema e descrição", () => {
    const nomes = Object.keys(ferramentas);

    expect(nomes).toHaveLength(TOTAL_DE_FERRAMENTAS);
    for (const nome of nomes) {
      expect(esquemas, nome).toHaveProperty(nome);
      expect(DESCRICOES[nome as keyof typeof DESCRICOES], nome).toBeTruthy();
    }
  });

  it("os esquemas são objetos fechados — entrada inesperada não passa calada", () => {
    for (const [nome, esquema] of Object.entries(esquemas)) {
      expect(esquema.type, nome).toBe("object");
      expect(esquema.additionalProperties, nome).toBe(false);
    }
  });

  it("toda resposta carrega a procedência do dado", async () => {
    const resposta = await ferramentas.consultar_ente({ ente: "Acre" });

    expect(resposta.procedencia).toContain("Painel ClimaBrasil");
    expect(resposta.procedencia).toContain(META.snapshot);
  });
});

describe("consultar_ente", () => {
  it("devolve os números do índice, sem recalcular nada", async () => {
    const { dados } = await ferramentas.consultar_ente({ ente: "Acre" });
    const real = ENTES["Acre"]!;

    expect(dados).toMatchObject({
      ente: "Acre",
      tipo: real.tipo,
      requisitosAvaliados: real.tot,
      semProgresso: real.lac,
      maturidade: real.mat,
      posicaoEmFragilidade: real.rank,
      totalDeEntes: META.total,
    });
  });

  it("ente desconhecido vira dado, não exceção — o agente precisa dizer 'não achei'", async () => {
    const { dados } = await ferramentas.consultar_ente({ ente: "Xanadu" });

    expect(dados).toMatchObject({ erro: "ente_nao_encontrado", procurado: "Xanadu" });
  });

  it("sugere os nomes mais próximos quando erra por pouco", async () => {
    const { dados } = await ferramentas.consultar_ente({ ente: "São Paulo" });

    // "São Paulo" sozinho é ambíguo desde a correção da colisão de entidades.
    expect(dados).toHaveProperty("erro");
    expect((dados as { sugestoes: string[] }).sugestoes).toEqual(
      expect.arrayContaining(["São Paulo (estado)", "São Paulo (capital)"]),
    );
  });

  it("lista só os componentes que têm lacuna, do pior para o melhor", async () => {
    const { dados } = await ferramentas.consultar_ente({ ente: "Boa Vista" });
    const comps = (dados as { componentesComLacuna: { maturidade: number; semProgresso: number }[] })
      .componentesComLacuna;

    expect(comps.length).toBeGreaterThan(0);
    expect(comps.every((c) => c.semProgresso > 0)).toBe(true);
    for (let i = 1; i < comps.length; i += 1) {
      expect(comps[i - 1]!.maturidade).toBeLessThanOrEqual(comps[i]!.maturidade);
    }
  });
});

describe("listar_achados", () => {
  it("transcreve o parecer do auditor na íntegra, sem resumir", async () => {
    const { dados, procedencia } = await ferramentas.listar_achados({ ente: "Boa Vista" });
    const grupos = (dados as { grupos: { itens: { parecerDaAuditoria: string }[] }[] }).grupos;
    const pareceres = grupos.flatMap((g) => g.itens.map((i) => i.parecerDaAuditoria));

    expect(pareceres.length).toBeGreaterThan(0);
    expect(procedencia).toContain("sem edição");
    // um parecer de auditoria tem centenas de caracteres; truncar seria perder a evidência
    expect(Math.max(...pareceres.map((p) => p.length))).toBeGreaterThan(200);
  });

  it("filtra por componente", async () => {
    const { dados } = await ferramentas.listar_achados({ ente: "Boa Vista", componente: "P5" });
    const grupos = (dados as { grupos: { codigo: string }[] }).grupos;

    expect(grupos.every((g) => g.codigo === "P5")).toBe(true);
  });

  it("filtra os de risco de vida — só defesa civil e adaptação", async () => {
    const { dados } = await ferramentas.listar_achados({
      ente: "Boa Vista",
      apenasRiscoDeVida: true,
    });
    const grupos = (dados as { grupos: { codigo: string }[] }).grupos;

    expect(grupos.length).toBeGreaterThan(0);
    expect(grupos.every((g) => g.codigo === "P5" || g.codigo === "P2")).toBe(true);
  });
});

describe("resumo_nacional", () => {
  it("usa a formulação de jurisdição, nunca a de risco físico", async () => {
    const resposta = await ferramentas.resumo_nacional({});
    const serializado = JSON.stringify(resposta);

    expect(serializado).toContain("populacaoSobJurisdicaoComLacuna");
    expect(serializado).not.toMatch(/emRisco|populacaoExposta|risco de morte/i);
  });

  it("respeita o recorte", async () => {
    const todos = await ferramentas.resumo_nacional({});
    const nordeste = await ferramentas.resumo_nacional({ regiao: "Nordeste" });

    expect((nordeste.dados as { entes: number }).entes).toBeLessThan(
      (todos.dados as { entes: number }).entes,
    );
  });
});

describe("ranquear", () => {
  it("devolve a decomposição de cada item — nada de caixa-preta", async () => {
    const { dados } = await ferramentas.ranquear({ perfil: "fiscalizacao", limite: 3 });
    const lista = (dados as { lista: { contribuicaoDeCadaCriterio: Record<string, number>; indiceDePrioridade: number }[] }).lista;

    expect(lista).toHaveLength(3);
    for (const item of lista) {
      const soma = Object.values(item.contribuicaoDeCadaCriterio).reduce((a, b) => a + b, 0);
      expect(soma).toBeCloseTo(item.indiceDePrioridade, 3);
    }
  });

  it("carrega os pesos usados, para a resposta poder citá-los", async () => {
    const { dados, procedencia } = await ferramentas.ranquear({ perfil: "politica", limite: 1 });

    expect((dados as { pesos: string }).pesos).toContain("Alavancagem");
    expect(procedencia).toContain("escolha de política");
  });

  it("os dois perfis devolvem listas diferentes", async () => {
    const fiscal = await ferramentas.ranquear({ perfil: "fiscalizacao", limite: 5 });
    const politica = await ferramentas.ranquear({ perfil: "politica", limite: 5 });

    const chave = (r: typeof fiscal) =>
      (r.dados as { lista: { ente: string; componente: string }[] }).lista
        .map((p) => `${p.ente}/${p.componente}`)
        .join(",");

    expect(chave(fiscal)).not.toBe(chave(politica));
  });
});

describe("projetar_regularizacao", () => {
  it("não devolve nenhum dado financeiro — o produto não tem esse dado", async () => {
    const resposta = await ferramentas.projetar_regularizacao({ ente: "Boa Vista", requisitos: 6 });

    // A verificação é sobre os DADOS. A procedência menciona "custo" de
    // propósito, justamente para dizer que não estima nenhum.
    expect(JSON.stringify(resposta.dados)).not.toMatch(/R\$|custo|investimento|orçament/i);
    expect(resposta.procedencia).toContain("não é previsão nem estimativa de custo");
  });

  it("não move mais requisitos do que o ente tem lacunas", async () => {
    const { dados } = await ferramentas.projetar_regularizacao({ ente: "Acre", requisitos: 999 });

    expect((dados as { requisitos: number }).requisitos).toBe(ENTES["Acre"]!.lac);
  });
});

describe("listar_quase_la", () => {
  it("traz os requisitos que já saíram do zero, com o próximo degrau nomeado", async () => {
    const { dados } = await ferramentas.listar_quase_la({ ente: "Acre", limite: 5 });
    const reqs = (dados as { requisitos: { estagioAtual: string; proximoEstagio: string }[] })
      .requisitos;

    expect(reqs.length).toBeGreaterThan(0);
    for (const r of reqs) {
      expect(["Estágio inicial", "Estágio intermediário"]).toContain(r.estagioAtual);
      expect(r.proximoEstagio).not.toBe(r.estagioAtual);
    }
  });
});

describe("buscar_precedente", () => {
  it("devolve a prática registrada, marcando que é referência e não modelo", async () => {
    const { dados, procedencia } = await ferramentas.buscar_precedente({ componente: "P5" });

    expect((dados as { total: number }).total).toBeGreaterThan(0);
    expect(procedencia).toContain("referência a adaptar, não modelo a copiar");
  });
});
