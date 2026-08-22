import { codigoAchado } from "@/lib/achados";
import type { DocumentoGerado } from "@/lib/documentos";

/**
 * Encaminhamento da peça por e-mail.
 *
 * O LIMITE QUE ESTE MÓDULO EXISTE PARA RESPEITAR
 *
 * O produto monta tudo até a borda do envio: redige a mensagem, lista os
 * destinatários prováveis, anexa o protocolo. **O disparo é um ato do usuário**,
 * não do sistema — uma peça de controle externo enviada em nome de alguém que
 * não leu o que estava indo é um risco que nenhum ganho de fluidez compensa.
 *
 * Do ponto de vista de quem usa, a diferença entre isto e o envio automático é
 * um clique. Esse clique é o que transforma "o sistema mandou" em "eu mandei",
 * que é a única forma de uma peça de controle ter dono.
 *
 * O PDF não vai no `mailto:` — nenhum cliente de e-mail aceita anexo por URL.
 * O fluxo é: baixar o PDF, abrir o rascunho preenchido, anexar e enviar. A
 * interface diz isso em vez de deixar o usuário descobrir que faltou o anexo.
 */

export interface Rascunho {
  assunto: string;
  corpo: string;
  /** Sugestões de destinatário; o usuário edita antes de qualquer coisa. */
  sugestoes: { rotulo: string; quando: string }[];
}

const SUGESTOES: Record<DocumentoGerado["tipo"], { rotulo: string; quando: string }[]> = {
  oficio: [
    { rotulo: "Gabinete do chefe do Executivo do ente", quando: "destinatário principal" },
    { rotulo: "Secretaria de Meio Ambiente ou equivalente", quando: "com cópia" },
    { rotulo: "Controladoria interna do ente", quando: "com cópia" },
  ],
  lai: [
    { rotulo: "Serviço de Informação ao Cidadão (SIC) do ente", quando: "destinatário principal" },
    { rotulo: "Ouvidoria", quando: "com cópia" },
  ],
  plano: [
    { rotulo: "Tribunal de contas responsável pela avaliação", quando: "destinatário principal" },
    { rotulo: "Controladoria interna do ente", quando: "com cópia" },
  ],
  legis: [
    { rotulo: "Mesa Diretora da casa legislativa", quando: "destinatário principal" },
    { rotulo: "Comissão de Meio Ambiente", quando: "com cópia" },
  ],
};

/**
 * A mensagem de encaminhamento.
 *
 * Cita protocolo, código de conferência e fonte — o destinatário precisa poder
 * verificar a peça sem depender de quem mandou. Nada aqui repete o conteúdo do
 * documento: a mensagem apresenta, o anexo prova.
 */
export function redigirRascunho(doc: DocumentoGerado, nomeEnte: string): Rascunho {
  const codigos = doc.achados.map(codigoAchado);
  const amostra = codigos.slice(0, 6).join(", ");
  const resto = codigos.length > 6 ? ` e outros ${codigos.length - 6}` : "";

  const corpo = [
    "Prezados,",
    "",
    `Encaminho em anexo ${doc.titulo.toLowerCase()} referente a ${nomeEnte}, protocolo ` +
      `${doc.protocolo.numero}.`,
    "",
    `A peça trata de ${codigos.length} ${codigos.length === 1 ? "item" : "itens"} de avaliação ` +
      `classificados como "Sem progresso" na avaliação de ação climática consolidada no Painel ` +
      `ClimaBrasil do Tribunal de Contas da União` +
      (doc.quadro.riscoDeVida > 0
        ? `, dos quais ${doc.quadro.riscoDeVida} em requisitos de defesa civil e adaptação`
        : "") +
      `: ${amostra}${resto}.`,
    "",
    `Cada item vem acompanhado do parecer técnico registrado pela auditoria e da base normativa ` +
      `correspondente.`,
    "",
    `Conferência: o código ${doc.protocolo.sha} é reproduzível a partir do mesmo ente, da mesma ` +
      `seleção de itens e da mesma extração de dados.`,
    "",
    `Fonte: ${doc.fonte}`,
    "",
    "Atenciosamente,",
  ].join("\n");

  return {
    assunto: `${doc.titulo} — ${nomeEnte} — protocolo ${doc.protocolo.numero}`,
    corpo,
    sugestoes: SUGESTOES[doc.tipo],
  };
}

/**
 * O link `mailto:` que abre o cliente do próprio usuário, já preenchido.
 *
 * Sem destinatário de propósito: quem decide para quem vai é a pessoa, e um
 * endereço pré-preenchido convida ao envio sem leitura.
 */
export function linkDeRascunho(rascunho: Rascunho): string {
  const params = new URLSearchParams({
    subject: rascunho.assunto,
    body: rascunho.corpo,
  });
  // URLSearchParams codifica espaço como "+", que alguns clientes de e-mail
  // mostram literalmente no corpo da mensagem.
  return `mailto:?${params.toString().replace(/\+/g, "%20")}`;
}
