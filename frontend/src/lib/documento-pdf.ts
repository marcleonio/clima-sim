import { codigoAchado, formatarNumero, formatarPercentual } from "@/lib/achados";
import type { DocumentoGerado } from "@/lib/documentos";

/**
 * Renderiza a peça de encaminhamento como PDF A4 e dispara o download.
 *
 * jsPDF entra por importação dinâmica: ele e o html2canvas somam quase 600 KB
 * e só fazem falta no clique de "Baixar PDF". Estaticamente importados,
 * viajavam para todo mundo que abrisse a página, inclusive quem só queria
 * consultar um ente.
 *
 * Segue a mesma estrutura da pré-visualização — capa, quadro-resumo, sumário,
 * corpo por eixo, trajetória e assinatura —, com numeração "página n de N"
 * escrita no fim, quando o total já é conhecido.
 */

const MARGEM = 56;
const TINTA = [23, 32, 33] as const;
const TINTA_FRACA = [120, 138, 136] as const;
const VERMELHO = [160, 58, 46] as const;

export async function baixarDocumentoPdf(doc: DocumentoGerado): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const largura = pdf.internal.pageSize.getWidth() - MARGEM * 2;
  const alturaPagina = pdf.internal.pageSize.getHeight();
  let y = MARGEM;

  const quebra = (necessario = 40) => {
    if (y + necessario > alturaPagina - MARGEM) {
      pdf.addPage();
      y = MARGEM;
    }
  };

  const paragrafo = (
    texto: string,
    opcoes: {
      tamanho?: number;
      estilo?: "normal" | "bold";
      cor?: readonly [number, number, number];
      recuo?: number;
      fonte?: "times" | "helvetica" | "courier";
    } = {},
  ) => {
    const { tamanho = 10.5, estilo = "normal", cor = TINTA, recuo = 0, fonte = "times" } = opcoes;
    pdf.setFont(fonte, estilo).setFontSize(tamanho).setTextColor(cor[0], cor[1], cor[2]);
    const linhas = pdf.splitTextToSize(texto, largura - recuo) as string[];
    for (const linha of linhas) {
      quebra(18);
      pdf.text(linha, MARGEM + recuo, y);
      y += tamanho * 1.45;
    }
  };

  const rotulo = (texto: string) => {
    quebra(24);
    pdf.setFont("helvetica", "bold").setFontSize(7.5);
    pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
    pdf.text(texto.toUpperCase(), MARGEM, y);
    y += 12;
  };

  const regua = (espaco = 14, forte = false) => {
    quebra(espaco + 8);
    y += espaco / 2;
    if (forte) pdf.setDrawColor(60, 70, 68).setLineWidth(1.4);
    else pdf.setDrawColor(214, 226, 220).setLineWidth(1);
    pdf.line(MARGEM, y, MARGEM + largura, y);
    pdf.setLineWidth(1);
    y += espaco;
  };

  // ---------------- capa
  pdf.setFont("helvetica", "bold").setFontSize(7.5);
  pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
  pdf.text(doc.timbre.origem.toUpperCase(), MARGEM, y);
  y += 16;

  pdf.setFont("helvetica", "bold").setFontSize(14).setTextColor(13, 33, 37);
  for (const linha of pdf.splitTextToSize(doc.titulo.toUpperCase(), largura) as string[]) {
    pdf.text(linha, MARGEM, y);
    y += 19;
  }

  pdf.setFont("courier", "normal").setFontSize(8);
  pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
  pdf.text(
    `Protocolo ${doc.protocolo.numero}  ·  conferência ${doc.protocolo.sha}  ·  ${doc.emitidoEm}`,
    MARGEM,
    y,
  );
  y += 8;
  regua(16, true);

  // ---------------- identificação
  rotulo("Destinatário");
  paragrafo(doc.destinatario);
  y += 4;
  rotulo("Assunto");
  paragrafo(doc.assunto);
  y += 4;
  rotulo("Fundamento");
  paragrafo(doc.fundamento);

  // ---------------- quadro-resumo
  y += 10;
  quebra(120);
  const topoQuadro = y - 12;
  rotulo("Quadro-resumo");

  const q = doc.quadro;
  const colunas = [
    [String(q.achados), `itens nesta peça, de ${q.requisitos} avaliados`],
    [String(q.riscoDeVida), "em defesa civil e adaptação"],
    [`${q.posicao}ª`, q.totalDeEntes ? `em fragilidade entre ${q.totalDeEntes}` : "em fragilidade"],
    [formatarPercentual(q.maturidade), "de pontuação"],
  ] as const;

  const larguraColuna = largura / colunas.length;
  colunas.forEach(([valor, texto], i) => {
    const x = MARGEM + i * larguraColuna;
    pdf.setFont("helvetica", "bold").setFontSize(17).setTextColor(TINTA[0], TINTA[1], TINTA[2]);
    if (i === 1) pdf.setTextColor(VERMELHO[0], VERMELHO[1], VERMELHO[2]);
    pdf.text(valor, x, y + 12);

    pdf.setFont("helvetica", "normal").setFontSize(7.5);
    pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
    const linhas = pdf.splitTextToSize(texto, larguraColuna - 8) as string[];
    linhas.slice(0, 2).forEach((l, j) => pdf.text(l, x, y + 26 + j * 9));
  });
  y += 48;

  const porEixo = q.porEixo.map(({ eixo, qtd }) => `${eixo}: ${qtd}`).join("    ");
  paragrafo(porEixo, { fonte: "helvetica", tamanho: 9, cor: TINTA_FRACA });
  if (q.populacao != null) {
    paragrafo(`Jurisdição com ${formatarNumero(q.populacao)} habitantes.`, {
      fonte: "helvetica",
      tamanho: 9,
      cor: TINTA_FRACA,
    });
  }

  pdf.setDrawColor(214, 226, 220);
  pdf.rect(MARGEM - 10, topoQuadro, largura + 20, y - topoQuadro + 6);
  y += 20;

  // ---------------- corpo
  for (const p of doc.paragrafos.slice(0, 3)) {
    paragrafo(p);
    y += 6;
  }

  for (const bloco of doc.blocos) {
    y += 10;
    quebra(70);
    pdf.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(TINTA[0], TINTA[1], TINTA[2]);
    pdf.text(
      `${bloco.eixo.toUpperCase()}   ${bloco.achados.length} ${
        bloco.achados.length === 1 ? "item" : "itens"
      }`,
      MARGEM,
      y,
    );
    y += 6;
    regua(10);

    for (const achado of bloco.achados) {
      quebra(80);
      const topo = y;

      paragrafo(`${codigoAchado(achado)} — ${achado.nome}`, {
        fonte: "helvetica",
        estilo: "bold",
        tamanho: 10.5,
        recuo: 14,
      });
      if (achado.lei) {
        paragrafo(`Base normativa: ${achado.lei}`, { tamanho: 8.5, cor: VERMELHO, recuo: 14 });
      }
      paragrafo(achado.txt, { tamanho: 10, cor: [70, 85, 84], recuo: 14 });

      if (doc.preencherCampos) {
        y += 2;
        for (const quesito of doc.quesitos) {
          paragrafo(`${quesito.replace(/;$/, "")}: ${"_".repeat(30)}`, {
            tamanho: 9,
            cor: [140, 152, 150],
            recuo: 14,
          });
        }
      }

      pdf.setDrawColor(192, 57, 43).setLineWidth(2);
      pdf.line(MARGEM + 2, topo - 9, MARGEM + 2, y - 8);
      pdf.setLineWidth(1);
      y += 12;
    }
  }

  // ---------------- quesitos numerados
  if (!doc.preencherCampos && doc.quesitos.length) {
    y += 8;
    doc.quesitos.forEach((quesito, i) => {
      paragrafo(`${i + 1}.  ${quesito}`, { recuo: 14 });
      y += 3;
    });
    y += 6;
  }

  for (const p of doc.paragrafos.slice(3)) {
    paragrafo(p);
    y += 6;
  }

  // ---------------- contexto sazonal
  if (doc.sazonal) {
    y += 10;
    quebra(60);
    rotulo("Contexto sazonal");
    paragrafo(doc.sazonal);
  }

  // ---------------- trajetória
  if (doc.trajetoria) {
    y += 10;
    quebra(70);
    rotulo("Trajetória de regularização");
    paragrafo(doc.trajetoria);
    paragrafo(
      "Aritmética da escala oficial da metodologia — quatro degraus por requisito, índice igual à média. Não é previsão nem modelo estatístico, e não estima custo.",
      { fonte: "helvetica", tamanho: 8, cor: TINTA_FRACA },
    );
  }

  // ---------------- assinatura
  y += 30;
  quebra(90);
  pdf.setFont("times", "normal").setFontSize(10.5).setTextColor(190, 200, 198);
  pdf.text("_".repeat(26), MARGEM + largura, y, { align: "right" });
  y += 12;
  pdf.setFont("helvetica", "normal").setFontSize(7.5);
  pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
  pdf.text("LOCAL E DATA", MARGEM + largura, y, { align: "right" });

  y += 40;
  pdf.setFont("times", "normal").setFontSize(10.5).setTextColor(190, 200, 198);
  pdf.text("_".repeat(38), MARGEM + largura / 2, y, { align: "center" });
  y += 12;
  pdf.setFont("helvetica", "normal").setFontSize(7.5);
  pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
  pdf.text(doc.timbre.assinatura.toUpperCase(), MARGEM + largura / 2, y, { align: "center" });

  // ---------------- procedência
  regua(16);
  paragrafo(`Documento gerado a partir de dados públicos oficiais. Fonte: ${doc.fonte}`, {
    fonte: "courier",
    tamanho: 7.5,
    cor: [140, 155, 153],
  });
  paragrafo(doc.conferencia, { fonte: "courier", tamanho: 7.5, cor: [140, 155, 153] });

  // ---------------- numeração, agora que o total é conhecido
  const paginas = pdf.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    pdf.setPage(i);
    pdf.setFont("courier", "normal").setFontSize(7.5);
    pdf.setTextColor(TINTA_FRACA[0], TINTA_FRACA[1], TINTA_FRACA[2]);
    pdf.text(
      `${doc.protocolo.numero}   ·   página ${i} de ${paginas}`,
      MARGEM + largura,
      alturaPagina - 28,
      { align: "right" },
    );
  }

  pdf.save(`${doc.tipo}-${doc.protocolo.numero.replace("/", "-")}.pdf`);
}
