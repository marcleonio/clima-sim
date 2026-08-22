/**
 * As ferramentas do agente.
 *
 * A REGRA QUE DEFINE ESTA ARQUITETURA: o modelo nunca produz um fato. Ele
 * escolhe ferramentas, lê o que elas devolvem e redige a ligação entre os
 * resultados. Todo número vem de retorno de ferramenta; todo trecho de parecer
 * é citação literal do `assessment_comment` do auditor.
 *
 * Num produto de controle externo, um número alucinado não é um bug de
 * qualidade — é o fim da credibilidade do projeto diante de um tribunal. Por
 * isso as ferramentas são determinísticas, puras e testáveis sem rede: elas
 * são a fonte de verdade, e o modelo é só o redator.
 *
 * Cada ferramenta devolve `{ dados, procedencia }`. A procedência diz de onde
 * o número saiu e permite que a resposta cite a fonte sem o modelo precisar
 * lembrar dela.
 */

import {
  agruparPorComponente,
  codigoAchado,
  COMPONENTES_CRITICOS,
  filtrarEntes,
  referenciaPara,
  taxaLacuna,
  type MapaReferencias,
} from "@/lib/achados";
import { carregarDossie, ENTES, META, NOMES_ENTES, taxasDosOutros } from "@/lib/dados";
import {
  descreverPesos,
  listaDeAcao,
  PESOS,
  type PerfilPriorizacao,
} from "@/lib/prioridade";
import {
  filtrarTerritorio,
  lacunasPorComponente,
  populacaoSobLacuna,
  REGIOES,
  resumirTerritorio,
  type Regiao,
  type TipoEnte,
} from "@/lib/territorio";
import { descreverTrajetoria, posicaoProjetada, projetar } from "@/lib/trajetoria";
import referenciasBrutas from "@/data/referencias.json";

const REFERENCIAS = referenciasBrutas as unknown as MapaReferencias;

/** Toda resposta de ferramenta carrega de onde o dado saiu. */
const PROCEDENCIA = `Painel ClimaBrasil / TCU · ${META.versao} · extração ${META.snapshot}`;

export interface RespostaFerramenta<T> {
  dados: T;
  procedencia: string;
}

function responder<T>(dados: T, detalhe?: string): RespostaFerramenta<T> {
  return { dados, procedencia: detalhe ? `${PROCEDENCIA} · ${detalhe}` : PROCEDENCIA };
}

/** Erro de ferramenta é dado, não exceção: o modelo precisa poder dizer "não achei". */
function naoEncontrado(nome: string) {
  return responder({
    erro: "ente_nao_encontrado" as const,
    procurado: nome,
    sugestoes: filtrarEntes(NOMES_ENTES, nome).slice(0, 5),
    dica: `A avaliação cobre ${META.total} entes: 26 estados, 24 capitais e o Distrito Federal.`,
  });
}

// ------------------------------------------------------------------ esquemas

/*
 * Os esquemas são JSON Schema puro, e não Zod, por uma razão concreta: o
 * `betaZodTool` do SDK espera os tipos internos do Zod v4, e o projeto está no
 * v3 (que o react-hook-form usa). `betaTool` aceita JSON Schema direto e o SDK
 * valida a entrada da mesma forma.
 */

const TIPOS_DE_ENTE = ["Estado", "Município", "todos"] as const;
const REGIOES_OPCAO = [...REGIOES, "todas"] as const;

const ENTE = { type: "string", description: "Nome exato do ente, como aparece no índice." } as const;
const COMPONENTE = {
  type: "string",
  description: "Código do componente da metodologia, por exemplo P5, F1 ou G3.",
} as const;

export const esquemas = {
  consultar_ente: {
    type: "object",
    properties: { ente: ENTE },
    required: ["ente"],
    additionalProperties: false,
  },

  listar_achados: {
    type: "object",
    properties: {
      ente: ENTE,
      componente: COMPONENTE,
      apenasRiscoDeVida: {
        type: "boolean",
        description: "Só os requisitos de defesa civil (P5) e adaptação (P2).",
      },
    },
    required: ["ente"],
    additionalProperties: false,
  },

  comparar_entes: {
    type: "object",
    properties: {
      entes: { type: "array", items: ENTE, minItems: 2, maxItems: 6 },
    },
    required: ["entes"],
    additionalProperties: false,
  },

  resumo_nacional: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: TIPOS_DE_ENTE },
      regiao: { type: "string", enum: REGIOES_OPCAO },
      componente: COMPONENTE,
    },
    required: [],
    additionalProperties: false,
  },

  ranquear: {
    type: "object",
    properties: {
      perfil: {
        type: "string",
        enum: ["fiscalizacao", "politica"],
        description:
          "fiscalizacao: onde a omissão é acionável e atinge mais gente. politica: onde se avança mais com menos.",
      },
      tipo: { type: "string", enum: TIPOS_DE_ENTE },
      regiao: { type: "string", enum: REGIOES_OPCAO },
      componente: COMPONENTE,
      limite: { type: "integer", minimum: 1, maximum: 30 },
    },
    required: ["perfil"],
    additionalProperties: false,
  },

  buscar_precedente: {
    type: "object",
    properties: {
      componente: COMPONENTE,
      item: { type: "string", description: "Letra do item dentro do componente, por exemplo A." },
    },
    required: ["componente"],
    additionalProperties: false,
  },

  projetar_regularizacao: {
    type: "object",
    properties: {
      ente: ENTE,
      requisitos: {
        type: "integer",
        minimum: 0,
        description: "Quantos requisitos sairiam de 'Sem progresso' para o degrau seguinte.",
      },
    },
    required: ["ente", "requisitos"],
    additionalProperties: false,
  },

  listar_quase_la: {
    type: "object",
    properties: {
      ente: ENTE,
      limite: { type: "integer", minimum: 1, maximum: 30 },
    },
    required: ["ente"],
    additionalProperties: false,
  },
} as const;

// Entradas de cada ferramenta, escritas à mão para não depender do Zod.
interface EntradaConsultarEnte { ente: string }
interface EntradaListarAchados { ente: string; componente?: string; apenasRiscoDeVida?: boolean }
interface EntradaCompararEntes { entes: string[] }
interface EntradaResumoNacional { tipo?: string; regiao?: string; componente?: string }
interface EntradaRanquear {
  perfil: string; tipo?: string; regiao?: string; componente?: string; limite?: number;
}
interface EntradaPrecedente { componente: string; item?: string }
interface EntradaProjecao { ente: string; requisitos: number }
interface EntradaQuaseLa { ente: string; limite?: number }

// ------------------------------------------------------------------ execução

export const ferramentas = {
  /** Resumo de um ente: o que o índice sabe, sem carregar parecer nenhum. */
  async consultar_ente({ ente }: EntradaConsultarEnte) {
    const alvo = ENTES[ente];
    if (!alvo) return naoEncontrado(ente);

    return responder({
      ente,
      tipo: alvo.tipo,
      populacao: alvo.pop,
      requisitosAvaliados: alvo.tot,
      semProgresso: alvo.lac,
      taxaDeLacuna: Number(taxaLacuna(alvo).toFixed(1)),
      maturidade: alvo.mat,
      mediaNacional: META.nacional.mat,
      posicaoEmFragilidade: alvo.rank,
      totalDeEntes: META.total,
      // Capacidade fiscal: distingue "não gastou" de "não tinha" no eixo
      // Financiamento, que é o mais frágil do país.
      financas: alvo.fin
        ? {
            receitaRealizada: alvo.fin.receita,
            receitaPorHabitante: alvo.fin.perCapita,
            exercicio: alvo.fin.exercicio,
            fonte: "SICONFI / Tesouro Nacional",
          }
        : null,
      porEixo: alvo.eixos,
      componentesComLacuna: Object.entries(alvo.comps)
        .filter(([, r]) => r.l > 0)
        .map(([c, r]) => ({
          codigo: c,
          nome: META.componentes[c] ?? c,
          semProgresso: r.l,
          avaliados: r.t,
          maturidade: r.m,
        }))
        .sort((a, b) => a.maturidade - b.maturidade),
    });
  },

  /**
   * Os achados com o parecer literal do auditor.
   *
   * O texto vem inteiro e sem edição — é a evidência, e resumir aqui seria
   * exatamente o tipo de perda que o produto existe para evitar.
   */
  async listar_achados({
    ente,
    componente: comp,
    apenasRiscoDeVida,
  }: EntradaListarAchados) {
    const alvo = ENTES[ente];
    if (!alvo) return naoEncontrado(ente);

    const dossie = await carregarDossie(ente);
    if (!dossie) return naoEncontrado(ente);

    let achados = dossie.achados;
    if (comp) achados = achados.filter((a) => a.c === comp);
    if (apenasRiscoDeVida) {
      achados = achados.filter((a) => (COMPONENTES_CRITICOS as readonly string[]).includes(a.c));
    }

    return responder(
      {
        ente,
        total: achados.length,
        grupos: agruparPorComponente(achados).map((g) => ({
          codigo: g.c,
          nome: g.nome,
          eixo: g.eixo,
          baseNormativa: g.lei,
          itens: g.itens.map((a) => ({
            codigo: codigoAchado(a),
            parecerDaAuditoria: a.txt,
          })),
        })),
      },
      "parecer transcrito na íntegra, sem edição",
    );
  },

  /** Compara entes lado a lado, nas mesmas medidas. */
  async comparar_entes({ entes }: EntradaCompararEntes) {
    const faltando = entes.filter((n) => !ENTES[n]);
    if (faltando.length) return naoEncontrado(faltando[0]!);

    return responder({
      comparados: entes.map((nome) => {
        const e = ENTES[nome]!;
        return {
          ente: nome,
          tipo: e.tipo,
          populacao: e.pop,
          maturidade: e.mat,
          semProgresso: e.lac,
          avaliados: e.tot,
          posicaoEmFragilidade: e.rank,
        };
      }),
      mediaNacional: META.nacional.mat,
      totalDeEntes: META.total,
    });
  },

  /** Números de um recorte do país. */
  async resumo_nacional({ tipo, regiao, componente: comp }: EntradaResumoNacional) {
    const selecionados = filtrarTerritorio(ENTES, {
      tipo: (tipo ?? "todos") as TipoEnte | "todos",
      regiao: (regiao ?? "todas") as Regiao | "todas",
      componente: comp ?? null,
    });

    const resumo = resumirTerritorio(selecionados);

    return responder(
      {
        recorte: { tipo: tipo ?? "todos", regiao: regiao ?? "todas", componente: comp ?? null },
        ...resumo,
        maturidadeNacional: META.nacional.mat,
        lacunasPorComponente: lacunasPorComponente(selecionados)
          .slice(0, 5)
          .map((b) => ({ codigo: b.c, nome: META.componentes[b.c] ?? b.c, semProgresso: b.lacunas })),
        // A formulação correta é "sob jurisdição", nunca "em risco".
        populacaoSobJurisdicaoComLacuna: {
          defesaCivilP5: populacaoSobLacuna(ENTES, "P5"),
          adaptacaoP2: populacaoSobLacuna(ENTES, "P2"),
        },
      },
      "população somada apenas entre estados e DF, que particionam o território",
    );
  },

  /** A lista de ação multicritério — o coração da pergunta "por onde começar". */
  async ranquear({ perfil, tipo, regiao, componente: comp, limite }: EntradaRanquear) {
    const selecionados = filtrarTerritorio(ENTES, {
      tipo: (tipo ?? "todos") as TipoEnte | "todos",
      regiao: (regiao ?? "todas") as Regiao | "todas",
      componente: comp ?? null,
    });

    const lista = listaDeAcao(
      selecionados.map(([nome, e]) => ({ nome, tipo: e.tipo, pop: e.pop, comps: e.comps })),
      META.componentes,
      REFERENCIAS,
      perfil as PerfilPriorizacao,
      limite ?? 10,
    );

    return responder(
      {
        perfil: PESOS[perfil as PerfilPriorizacao].nome,
        pergunta: PESOS[perfil as PerfilPriorizacao].pergunta,
        pesos: descreverPesos(PESOS[perfil as PerfilPriorizacao].pesos),
        lista: lista.map((p, i) => ({
          posicao: i + 1,
          ente: p.ente,
          tipo: p.tipo,
          componente: p.componente,
          nomeComponente: p.nomeComponente,
          indiceDePrioridade: p.ipa,
          semProgresso: p.lacunas,
          avaliados: p.total,
          contribuicaoDeCadaCriterio: p.contribuicoes,
        })),
      },
      "os pesos são escolha de política, não descoberta empírica, e devem ser citados junto",
    );
  },

  /** Quem já resolveu o mesmo requisito — e o que a auditoria registrou. */
  async buscar_precedente({ componente: comp, item }: EntradaPrecedente) {
    const chaves = item
      ? [`${comp}${item}`]
      : Object.keys(REFERENCIAS).filter((k) => k.startsWith(comp));

    const encontrados = chaves.flatMap((chave) => {
      const c = chave.slice(0, comp.length);
      const i = chave.slice(comp.length);
      return referenciaPara(REFERENCIAS, { c, i }).map((r) => ({
        requisito: chave,
        ente: r.ente,
        tipo: r.tipo,
        praticaRegistrada: r.txt,
      }));
    });

    return responder(
      {
        componente: comp,
        nomeComponente: META.componentes[comp] ?? comp,
        precedentes: encontrados,
        total: encontrados.length,
      },
      "prática registrada pela auditoria em ente avaliado como Estágio avançado no mesmo requisito; referência a adaptar, não modelo a copiar",
    );
  },

  /**
   * Trajetória de regularização — aritmética da escala oficial.
   *
   * Sem econometria e sem dinheiro: o produto não tem dado para dizer quanto
   * custa sair de um degrau.
   */
  async projetar_regularizacao({
    ente,
    requisitos,
  }: EntradaProjecao) {
    const alvo = ENTES[ente];
    if (!alvo) return naoEncontrado(ente);

    const trajetoria = projetar(alvo, requisitos, 1);
    const posicao = posicaoProjetada(alvo, trajetoria, taxasDosOutros(ente), alvo.rank);

    return responder(
      {
        ente,
        ...trajetoria,
        posicaoAtual: posicao.atual,
        posicaoProjetada: posicao.projetada,
        totalDeEntes: posicao.total,
        frase: descreverTrajetoria(ente, trajetoria, posicao),
      },
      "aritmética da escala oficial de quatro degraus; não é previsão nem estimativa de custo",
    );
  },

  /**
   * Os "quase lá": requisitos que já saíram do zero.
   *
   * São 1.113 no país e o produto não os mostrava. Para quem produz política
   * pública, é o alvo de maior alavancagem que existe na base.
   */
  async listar_quase_la({ ente, limite }: EntradaQuaseLa) {
    const alvo = ENTES[ente];
    if (!alvo) return naoEncontrado(ente);

    const dossie = await carregarDossie(ente);
    if (!dossie) return naoEncontrado(ente);

    const degrau = ["Sem progresso", "Estágio inicial", "Estágio intermediário", "Estágio avançado"];

    return responder(
      {
        ente,
        total: dossie.parciais.length,
        requisitos: dossie.parciais.slice(0, limite ?? 10).map((p) => ({
          codigo: codigoAchado(p),
          nome: p.nome,
          eixo: p.eixo,
          estagioAtual: degrau[p.grau] ?? String(p.grau),
          proximoEstagio: degrau[p.grau + 1] ?? "Estágio avançado",
          parecerDaAuditoria: p.txt,
        })),
      },
      "requisitos com ação parcial documentada — já saíram do zero",
    );
  },
};

export type NomeFerramenta = keyof typeof ferramentas;

/** Descrições que vão para o modelo. Ficam aqui para o texto ser revisável. */
export const DESCRICOES: Record<NomeFerramenta, string> = {
  consultar_ente:
    "Resumo de um ente avaliado: maturidade, quantos requisitos sem progresso, posição em fragilidade e quais componentes têm lacuna. Use antes de qualquer afirmação sobre um ente específico.",
  listar_achados:
    "Os requisitos sem progresso de um ente, com o parecer técnico que o auditor escreveu para cada um. Use quando precisar citar a evidência.",
  comparar_entes:
    "Compara de 2 a 6 entes nas mesmas medidas. Use quando a pergunta for comparativa.",
  resumo_nacional:
    "Números de um recorte do país, com filtro por tipo de ente, região e componente. Use para perguntas agregadas.",
  ranquear:
    "Lista de ação multicritério: por onde começar, e por quê. Devolve a contribuição de cada critério. Escolha o perfil conforme quem pergunta.",
  buscar_precedente:
    "Entes que já resolveram um requisito e o que a auditoria registrou que eles fizeram. Use para responder 'como resolver'.",
  projetar_regularizacao:
    "Efeito no índice se N requisitos saírem de 'Sem progresso' para o degrau seguinte. Aritmética da escala oficial, sem modelo estatístico e sem custo.",
  listar_quase_la:
    "Requisitos do ente que já saíram do zero e estão a um degrau de avançar, com o parecer. Use para perguntas sobre onde é mais fácil avançar.",
};

/** Quantas ferramentas o agente tem. Usado no teste que trava a lista. */
export const TOTAL_DE_FERRAMENTAS = Object.keys(ferramentas).length;
