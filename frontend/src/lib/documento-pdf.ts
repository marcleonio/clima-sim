import { jsPDF } from "jspdf";

import { codigoAchado } from "@/lib/achados";
import type { DocumentoGerado } from "@/lib/documentos";

/**
 * Renderiza a peça de encaminhamento como PDF A4 e dispara o download.
 *
 * Mantém o mesmo estilo de construção do clima-pdf.ts (jsPDF em pontos, com
 * controle manual de quebra de página) para que os dois relatórios do produto
 * tenham a mesma aparência impressa.
 */
export function baixarDocumentoPdf(doc: DocumentoGerado): void {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 56;
  const largura = pdf.internal.pageSize.getWidth() - margem * 2;
  const alturaPagina = pdf.internal.pageSize.getHeight();
  let y = margem;

  const quebra = (necessario = 40) => {
    if (y + necessario > alturaPagina - margem) {
      pdf.addPage();
      y = margem;
    }
  };

  const paragrafo = (texto: string, opcoes: { tamanho?: number; estilo?: "normal" | "bold"; cor?: [number, number, number]; recuo?: number } = {}) => {
    const { tamanho = 10.5, estilo = "normal", cor = [23, 32, 33], recuo = 0 } = opcoes;
    pdf.setFont("times", estilo).setFontSize(tamanho).setTextColor(...cor);
    const linhas = pdf.splitTextToSize(texto, largura - recuo) as string[];
    for (const linha of linhas) {
      quebra(18);
      pdf.text(linha, margem + recuo, y);
      y += tamanho * 1.45;
    }
  };

  const rotulo = (texto: string) => {
    quebra(24);
    pdf.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(120, 138, 136);
    pdf.text(texto.toUpperCase(), margem, y);
    y += 12;
  };

  const regua = (espaco = 14) => {
    quebra(espaco + 8);
    y += espaco / 2;
    pdf.setDrawColor(214, 226, 220).line(margem, y, margem + largura, y);
    y += espaco;
  };

  // ---- cabeçalho
  pdf.setFont("helvetica", "bold").setFontSize(13).setTextColor(13, 33, 37);
  const titulo = pdf.splitTextToSize(doc.titulo.toUpperCase(), largura) as string[];
  for (const linha of titulo) {
    pdf.text(linha, margem + largura / 2, y, { align: "center" });
    y += 18;
  }
  pdf.setFont("courier", "normal").setFontSize(8).setTextColor(130, 145, 143);
  pdf.text(
    `Protocolo ${doc.protocolo.numero}  ·  sha ${doc.protocolo.sha}  ·  ${doc.emitidoEm}`,
    margem + largura / 2,
    y,
    { align: "center" },
  );
  y += 26;

  // ---- identificação
  rotulo("Destinatário");
  paragrafo(doc.destinatario);
  y += 4;
  rotulo("Assunto");
  paragrafo(doc.assunto);
  y += 4;
  rotulo("Fundamento");
  paragrafo(doc.fundamento);
  regua(18);

  // ---- corpo, antes dos achados
  for (const p of doc.paragrafos.slice(0, 3)) {
    paragrafo(p);
    y += 6;
  }

  // ---- achados
  y += 6;
  for (const achado of doc.achados) {
    quebra(80);
    const topo = y;

    paragrafo(`${codigoAchado(achado)} — ${achado.nome}`, { estilo: "bold", tamanho: 11, recuo: 14 });
    if (achado.lei) {
      paragrafo(`Base normativa: ${achado.lei}`, { tamanho: 8.5, cor: [160, 58, 46], recuo: 14 });
    }
    paragrafo(achado.txt, { tamanho: 10, cor: [70, 85, 84], recuo: 14 });

    if (doc.preencherCampos) {
      y += 2;
      for (const quesito of doc.quesitos) {
        paragrafo(`${quesito.replace(/;$/, "")}: ${"_".repeat(34)}`, {
          tamanho: 9,
          cor: [140, 152, 150],
          recuo: 14,
        });
      }
    }

    // barra vertical marcando o achado
    pdf.setDrawColor(192, 57, 43).setLineWidth(2);
    pdf.line(margem + 2, topo - 9, margem + 2, y - 8);
    pdf.setLineWidth(1);
    y += 12;
  }

  // ---- quesitos numerados (quando não são campos a preencher)
  if (!doc.preencherCampos && doc.quesitos.length) {
    y += 2;
    doc.quesitos.forEach((quesito, i) => {
      paragrafo(`${i + 1}.  ${quesito}`, { recuo: 14 });
      y += 3;
    });
    y += 6;
  }

  // ---- fechamento
  for (const p of doc.paragrafos.slice(3)) {
    paragrafo(p);
    y += 6;
  }

  // ---- procedência
  regua(16);
  pdf.setFont("courier", "normal").setFontSize(7.5).setTextColor(140, 155, 153);
  const rodape = pdf.splitTextToSize(
    `Documento gerado a partir de dados públicos oficiais. Fonte: ${doc.fonte}`,
    largura,
  ) as string[];
  for (const linha of rodape) {
    quebra(14);
    pdf.text(linha, margem, y);
    y += 11;
  }

  const nome = `${doc.tipo}-${doc.protocolo.numero.replace("/", "-")}.pdf`;
  pdf.save(nome);
}
