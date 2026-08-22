/**
 * Geração das peças de encaminhamento.
 *
 * Um achado só vira valor público quando alguém consegue levá-lo a uma mesa.
 * Este módulo transforma achados selecionados em documentos administrativos
 * prontos para protocolar — cada um endereçado a um fluxo real de controle.
 *
 * Regra de ouro: nada aqui inventa informação. Todo texto ou vem da fonte
 * oficial (parecer da auditoria, base normativa, dados do ente) ou é fórmula
 * administrativa padrão. O que o gestor precisa preencher fica explícito.
 */

import {
  codigoAchado,
  formatarNumero,
  formatarPercentual,
  ordenarPorPrioridade,
  protocoloDe,
  taxaLacuna,
  type Achado,
  type Ente,
  type Protocolo,
} from "@/lib/achados";

export type TipoDocumento = "oficio" | "lai" | "plano" | "legis";

export interface DefinicaoDocumento {
  id: TipoDocumento;
  /** Quem envia para quem. */
  fluxo: string;
  nome: string;
  descricao: string;
}

export const TIPOS_DOCUMENTO: DefinicaoDocumento[] = [
  {
    id: "oficio",
    fluxo: "Tribunal de Contas → Gestor",
    nome: "Ofício de requisição de informações",
    descricao: "Solicita esclarecimento formal sobre os achados, com prazo de resposta.",
  },
  {
    id: "lai",
    fluxo: "Cidadão · Imprensa → Órgão",
    nome: "Requerimento de acesso à informação",
    descricao: "Pedido com base na Lei 12.527/2011, pronto para protocolar.",
  },
  {
    id: "plano",
    fluxo: "Gestor → Tribunal de Contas",
    nome: "Plano de providências",
    descricao: "Estrutura a resposta: causa, ação corretiva, responsável e prazo.",
  },
  {
    id: "legis",
    fluxo: "Vereador · Deputado",
    nome: "Requerimento legislativo",
    descricao: "Leva o achado ao plenário como pedido formal de informação.",
  },
];

/**
 * Quem está olhando.
 *
 * As quatro peças pertencem a atores diferentes — tribunal, cidadão, gestor,
 * parlamentar — mas a tela não sabia quem estava ali e oferecia as quatro com
 * peso idêntico, obrigando a ler quatro descrições para decidir. Uma pergunta
 * só resolve isso e ainda serve de entrada para a priorização multicritério.
 */
export type Perfil = "controle" | "cidadao" | "gestor" | "legislativo";

export interface DefinicaoPerfil {
  id: Perfil;
  nome: string;
  descricao: string;
  /** A peça que este perfil emite por padrão — vira a ação primária da tela. */
  documento: TipoDocumento;
}

export const PERFIS: DefinicaoPerfil[] = [
  {
    id: "controle",
    nome: "Controle externo",
    descricao: "Tribunal de contas, Ministério Público, controladoria",
    documento: "oficio",
  },
  {
    id: "gestor",
    nome: "Gestor público",
    descricao: "Secretaria, órgão ou prefeitura avaliada",
    documento: "plano",
  },
  {
    id: "legislativo",
    nome: "Legislativo",
    descricao: "Vereador, deputado, assessoria parlamentar",
    documento: "legis",
  },
  {
    id: "cidadao",
    nome: "Cidadão ou imprensa",
    descricao: "Jornalista, pesquisador, organização da sociedade civil",
    documento: "lai",
  },
];

export function perfilPadrao(perfil: Perfil): DefinicaoPerfil {
  return PERFIS.find((p) => p.id === perfil) ?? PERFIS[0]!;
}

/** A peça primária do perfil, seguida das demais na ordem original. */
export function documentosPara(perfil: Perfil): DefinicaoDocumento[] {
  const alvo = perfilPadrao(perfil).documento;
  const primaria = TIPOS_DOCUMENTO.find((t) => t.id === alvo);
  if (!primaria) return TIPOS_DOCUMENTO;
  return [primaria, ...TIPOS_DOCUMENTO.filter((t) => t.id !== alvo)];
}

export interface ContextoDocumento {
  nomeEnte: string;
  ente: Ente;
  /** Achados escolhidos. Vazio significa "todos os do ente". */
  achados: Achado[];
  snapshot: string;
  versao: string;
  emitidoEm: Date;
}

export interface DocumentoGerado {
  tipo: TipoDocumento;
  titulo: string;
  protocolo: Protocolo;
  emitidoEm: string;
  destinatario: string;
  assunto: string;
  fundamento: string;
  paragrafos: string[];
  /** Itens numerados: quesitos do ofício, pedidos da LAI, campos do plano. */
  quesitos: string[];
  achados: Achado[];
  /** true quando o documento é um formulário a ser completado à mão. */
  preencherCampos: boolean;
  fonte: string;
}

function dataPorExtenso(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function gerarDocumento(
  tipo: TipoDocumento,
  contexto: ContextoDocumento,
): DocumentoGerado {
  const { nomeEnte, ente, snapshot, versao, emitidoEm } = contexto;

  const selecionados = contexto.achados.length ? contexto.achados : ente.achados;
  const achados = ordenarPorPrioridade(selecionados);

  const semente = [
    nomeEnte,
    tipo,
    achados.map(codigoAchado).join(","),
    snapshot,
  ].join("|");
  const protocolo = protocoloDe(semente, emitidoEm.getFullYear());

  const taxa = formatarPercentual(taxaLacuna(ente));
  const qualificacao = `${nomeEnte} (${ente.tipo})`;
  const populacao = ente.pop ? `${formatarNumero(ente.pop)} habitantes` : null;

  const fonte =
    `Painel ClimaBrasil — Tribunal de Contas da União, ${versao}, extração de ${snapshot}. ` +
    `Metodologia ClimateScanner/INTOSAI. População: IBGE. ` +
    `Conferência: o mesmo conjunto de achados e a mesma extração reproduzem este protocolo.`;

  const base = {
    tipo,
    protocolo,
    emitidoEm: dataPorExtenso(emitidoEm),
    achados,
    fonte,
    preencherCampos: false,
  };

  const diagnostico =
    `O ente apresenta ${ente.lac} de ${ente.tot} requisitos sem progresso (${taxa}), ` +
    `ocupando a ${ente.rank}ª posição em fragilidade entre os entes avaliados no país.`;

  switch (tipo) {
    case "oficio":
      return {
        ...base,
        titulo: "Ofício de requisição de informações",
        destinatario: `Ao Chefe do Poder Executivo de ${qualificacao}`,
        assunto: "Requisição de informações sobre lacunas identificadas na avaliação de ação climática",
        fundamento: "Competência de controle externo",
        paragrafos: [
          "Senhor(a) Gestor(a),",
          "No exercício da competência de controle externo, e considerando os resultados da avaliação de ação climática consolidada no Painel ClimaBrasil, requisita-se manifestação formal quanto aos requisitos abaixo, nos quais não foi demonstrada ação (classificação “Sem progresso”).",
          diagnostico,
          "Diante do exposto, solicita-se que sejam informados, no prazo de 15 (quinze) dias:",
        ],
        quesitos: [
          "as providências adotadas ou planejadas para cada requisito acima;",
          "o cronograma de implementação, com marcos verificáveis;",
          "a unidade administrativa e o servidor responsáveis por cada ação;",
          "a dotação orçamentária vinculada, se houver.",
        ],
      };

    case "lai":
      return {
        ...base,
        titulo: "Requerimento de acesso à informação",
        destinatario: `Ao Serviço de Informação ao Cidadão (SIC) — ${qualificacao}`,
        assunto: "Pedido de informação sobre requisitos de ação climática sem progresso",
        fundamento: "Lei nº 12.527/2011 (Lei de Acesso à Informação), arts. 10 e 11",
        paragrafos: [
          "Com base na Lei de Acesso à Informação (Lei nº 12.527/2011), solicito informações sobre os requisitos de ação climática abaixo, nos quais a avaliação técnica consolidada no Painel ClimaBrasil registrou ausência de ação demonstrada.",
          diagnostico,
          "Especificamente, requeiro:",
          "Solicito resposta no prazo legal de 20 (vinte) dias, prorrogável por mais 10, nos termos do art. 11, §1º e §2º da Lei nº 12.527/2011.",
        ],
        quesitos: [
          "cópia dos atos normativos, planos ou programas relacionados a cada requisito, se existentes;",
          "informação sobre a existência de dotação orçamentária destinada ao tema;",
          "a identificação do setor responsável pela matéria neste ente;",
          "caso não existam as ações, a justificativa formal para a ausência.",
        ],
      };

    case "plano":
      return {
        ...base,
        preencherCampos: true,
        titulo: "Plano de providências",
        destinatario: `Ao Tribunal de Contas — referente a ${qualificacao}`,
        assunto: "Resposta às lacunas identificadas na avaliação de ação climática",
        fundamento: populacao
          ? `Ente com população estimada de ${populacao}`
          : "Resposta do gestor ao controle externo",
        paragrafos: [
          "Este plano estrutura a resposta do ente aos requisitos em que a avaliação não identificou ação demonstrada.",
          diagnostico,
          "Para cada achado listado adiante, devem ser preenchidos os campos abaixo:",
          "Declaro que as informações prestadas são verídicas e que as ações descritas contam com respaldo orçamentário e institucional.",
        ],
        quesitos: [
          "Causa identificada para a ausência da ação;",
          "Ação corretiva a ser implementada;",
          "Responsável (unidade e servidor);",
          "Prazo de conclusão.",
        ],
      };

    case "legis":
    default:
      return {
        ...base,
        titulo: "Requerimento de informação",
        destinatario: "À Mesa Diretora — requerimento de informação ao Poder Executivo",
        assunto: `Lacunas de ação climática identificadas em ${qualificacao}`,
        fundamento: "Requerimento de informação, na forma regimental",
        paragrafos: [
          "Requeiro, na forma regimental, que seja oficiado ao Poder Executivo solicitando informações sobre as lacunas de ação climática identificadas na avaliação consolidada no Painel ClimaBrasil, do Tribunal de Contas da União.",
          `Justificativa. A avaliação técnica registrou ${ente.lac} requisitos sem qualquer ação demonstrada neste ente, o equivalente a ${taxa} do total avaliado` +
            (populacao ? `, em jurisdição com população estimada de ${populacao}` : "") +
            ". Requisitos de defesa civil e adaptação climática apoiam-se em obrigações legais, entre elas a Lei nº 12.608/2012, que institui a Política Nacional de Proteção e Defesa Civil.",
          "Diante da relevância da matéria para a proteção da população, requer-se manifestação do Executivo sobre as providências em curso.",
        ],
        quesitos: [
          "quais providências estão em curso para cada requisito;",
          "qual o prazo previsto para regularização;",
          "qual a previsão orçamentária destinada ao tema.",
        ],
      };
  }
}
