import { jsPDF } from "jspdf";

import type { SimulacaoResponse } from "@/lib/clima-api";

const ROTULOS: Record<string, string> = {
  MATURIDADE_ALTA: "Maturidade alta",
  GARGALO_DETECTADO: "Gargalo detectado",
  ACIMA_DA_MEDIA: "Acima da média",
  DENTRO_DA_MEDIA: "Dentro da média",
  ABAIXO_DA_MEDIA: "Abaixo da média",
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALERTA: "Alerta",
  CRITICO: "Crítico",
  GANHO: "Ganho",
  PERDA: "Perda",
  NEUTRO: "Neutro",
};

const rot = (v: string) => ROTULOS[v] ?? v;

export function exportarRelatorioPdf(
  sim: SimulacaoResponse,
  ajustes: { ajusteFinanciamento: number; ajusteGovernanca: number; ajustePoliticas: number },
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 48;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = margem;

  const quebra = (necessario = 40) => {
    if (y + necessario > alturaPagina - margem) {
      doc.addPage();
      y = margem;
    }
  };

  const titulo = (texto: string) => {
    quebra(50);
    y += 14;
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(20, 83, 45);
    doc.text(texto, margem, y);
    y += 6;
    doc.setDrawColor(200, 220, 208).line(margem, y, margem + largura, y);
    y += 14;
  };

  const linha = (label: string, valor: string) => {
    quebra();
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90, 100, 95);
    doc.text(label, margem, y);
    doc.setFont("helvetica", "bold").setTextColor(30, 40, 35);
    doc.text(valor, margem + 230, y);
    y += 17;
  };

  const paragrafo = (texto: string) => {
    const linhas = doc.splitTextToSize(texto, largura);
    quebra(linhas.length * 13 + 8);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(70, 80, 75);
    doc.text(linhas, margem, y);
    y += linhas.length * 13 + 6;
  };

  // Cabeçalho
  doc.setFillColor(20, 83, 45).rect(0, 0, doc.internal.pageSize.getWidth(), 96, "F");
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(255, 255, 255);
  doc.text("ClimaSim — Relatório de Simulação", margem, 48);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(
    `${sim.metadados.entidadeSelecionada} · ${sim.metadados.tipoEntidade} · ${new Date(
      sim.metadados.dataSimulacao,
    ).toLocaleString("pt-BR")}`,
    margem,
    70,
  );
  y = 130;

  const r = sim.resumo;

  titulo("Cenário simulado");
  linha("Ajuste em Financiamento Climático", `${ajustes.ajusteFinanciamento}%`);
  linha("Ajuste em Governança & Transparência", `${ajustes.ajusteGovernanca}%`);
  linha("Ajuste em Execução de Políticas", `${ajustes.ajustePoliticas}%`);

  titulo("Indicadores-chave");
  linha(
    "Índice global de resposta climática",
    `${r.scoreGeralProjetado.toFixed(1)} / 100 (hoje ${r.scoreGeralAtual.toFixed(1)})`,
  );
  linha(
    "Variação projetada em 4 anos",
    `${r.variacaoPercentual > 0 ? "+" : ""}${r.variacaoPercentual}% · ${r.statusGeral}`,
  );
  linha(
    "Capacidade de absorção",
    `${r.taxaAbsorcaoAbsorvida.toFixed(0)}% · ${rot(r.statusAbsorcao)}`,
  );
  linha("ROI climático estimado", `${r.roiClimaticoEstimado.toFixed(1)}x por R$ investido`);
  linha("Maturidade relativa", rot(r.maturidadeRelativa));
  linha(
    "Risco de descontinuidade",
    `${r.riscoDescontinuidadePct.toFixed(0)}% · ${rot(r.nivelRiscoOperacional)}`,
  );
  if (r.fatorAlavancagem?.mensagemFormatada) paragrafo(r.fatorAlavancagem.mensagemFormatada);
  if (r.mensagemDiagnostico) paragrafo(r.mensagemDiagnostico);

  titulo("Eixos analisados");
  sim.kpisEixos.forEach((k) =>
    linha(
      k.nomeExibicao,
      `${k.scoreAtual.toFixed(1)} → ${k.scoreProjetado.toFixed(1)} (${k.tendencia})`,
    ),
  );

  titulo("Projeção ano a ano");
  sim.seriesTemporais.linhasGrafico.forEach((l) =>
    linha(
      l.nomeLinha,
      sim.seriesTemporais.labelsAnos
        .map((a, i) => `${a}: ${(l.valoresAnoAAno[i] ?? 0).toFixed(1)}`)
        .join("   "),
    ),
  );

  titulo("Trade-offs identificados");
  sim.listaTradeOffs.forEach((t) => {
    quebra(50);
    doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(30, 40, 35);
    doc.text(`${rot(t.tipo)} · ${t.eixoAfetado} — ${t.titulo}`, margem, y);
    y += 14;
    paragrafo(t.descricaoAmigavel);
  });

  const nome = sim.metadados.entidadeSelecionada.replace(/[^\w]+/g, "-").toLowerCase();
  doc.save(`clima-brasil-${nome}.pdf`);
}
