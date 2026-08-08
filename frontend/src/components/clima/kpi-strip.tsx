import {
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  Minus,
  ShieldAlert,
  Sprout,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SimulacaoResponse } from "@/lib/clima-api";

const ROTULO_ABSORCAO = {
  MATURIDADE_ALTA: "Maturidade alta",
  GARGALO_DETECTADO: "Gargalo detectado",
} as const;

const ROTULO_MATURIDADE = {
  ACIMA_DA_MEDIA: "Acima da média",
  DENTRO_DA_MEDIA: "Dentro da média",
  ABAIXO_DA_MEDIA: "Abaixo da média",
} as const;

const ROTULO_RISCO = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALERTA: "Alerta",
  CRITICO: "Crítico",
} as const;

function Kpi({
  titulo,
  Icon,
  destaque,
  sufixo,
  tag,
  tagClasse,
  detalhe,
  borda,
}: {
  titulo: string;
  Icon: typeof Gauge;
  destaque: string;
  sufixo?: string | undefined;
  tag: string;
  tagClasse: string;
  detalhe: string;
  borda?: string | undefined;
}) {
  return (
    <Card className={`card-soft border-border/70 ${borda ?? ""}`}>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {titulo}
          </p>
          <Icon className="size-4 text-primary" />
        </div>
        <div className="flex items-end gap-1.5">
          <span
            className={`font-display leading-tight tabular-nums ${destaque.length > 8 ? "text-2xl" : "text-4xl"}`}
          >
            {destaque}
          </span>
          {sufixo ? <span className="pb-1 text-sm text-muted-foreground">{sufixo}</span> : null}
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${tagClasse}`}
        >
          {tag}
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">{detalhe}</p>
      </CardContent>
    </Card>
  );
}

export function KpiStrip({ sim }: { sim: SimulacaoResponse }) {
  const r = sim.resumo;
  const positivo = r.variacaoPercentual > 0.5;
  const negativo = r.variacaoPercentual < -0.5;
  const SetaVar = positivo ? ArrowUpRight : negativo ? ArrowDownRight : Minus;
  const riscoAlto = r.nivelRiscoOperacional === "ALERTA" || r.nivelRiscoOperacional === "CRITICO";

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      <Kpi
        titulo="Índice global de resposta"
        Icon={SetaVar}
        destaque={r.scoreGeralProjetado.toFixed(1)}
        sufixo={`/100 · hoje ${r.scoreGeralAtual.toFixed(1)}`}
        tag={`${r.variacaoPercentual > 0 ? "+" : ""}${r.variacaoPercentual}% · ${r.statusGeral}`}
        tagClasse={
          positivo
            ? "bg-primary/10 text-primary"
            : negativo
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground"
        }
        detalhe="Score consolidado dos três eixos ao fim dos 4 anos de mandato."
      />

      <Kpi
        titulo="Capacidade de absorção"
        Icon={Gauge}
        destaque={`${r.taxaAbsorcaoAbsorvida.toFixed(0)}%`}
        tag={ROTULO_ABSORCAO[r.statusAbsorcao] ?? r.statusAbsorcao}
        tagClasse={
          r.statusAbsorcao === "MATURIDADE_ALTA"
            ? "bg-primary/10 text-primary"
            : "bg-accent/25 text-accent-foreground"
        }
        detalhe={
          r.statusAbsorcao === "MATURIDADE_ALTA"
            ? "A estrutura de governança converte o orçamento captado em execução real."
            : "Parte do orçamento tende a ficar represada por limitações de equipe técnica."
        }
      />

      <Kpi
        titulo="ROI climático"
        Icon={TrendingUp}
        destaque={`${r.roiClimaticoEstimado.toFixed(1)}x`}
        sufixo="por R$ investido"
        tag={`+${r.fatorAlavancagem?.variacaoInvestimentoPct ?? 10}% → +${(r.fatorAlavancagem?.impactoGeralEstimadoPct ?? 0).toFixed(1)}%`}
        tagClasse="bg-water/15 text-foreground"
        detalhe={
          r.fatorAlavancagem?.mensagemFormatada ??
          "Retorno climático estimado por ponto de score investido."
        }
      />

      <Kpi
        titulo="Maturidade relativa"
        Icon={Sprout}
        destaque={ROTULO_MATURIDADE[r.maturidadeRelativa] ?? r.maturidadeRelativa}
        tag={r.maturidadeRelativa === "ABAIXO_DA_MEDIA" ? "Atenção federativa" : "Estratégia sustentável"}
        tagClasse={
          r.maturidadeRelativa === "ACIMA_DA_MEDIA"
            ? "bg-primary/10 text-primary"
            : r.maturidadeRelativa === "ABAIXO_DA_MEDIA"
              ? "bg-destructive/10 text-destructive"
              : "bg-secondary text-secondary-foreground"
        }
        detalhe={`Comparação da maturidade de ${sim.metadados.entidadeSelecionada} com a média dos entes da mesma esfera.`}
      />

      <Kpi
        titulo="Risco de descontinuidade"
        Icon={ShieldAlert}
        destaque={`${r.riscoDescontinuidadePct.toFixed(0)}%`}
        tag={ROTULO_RISCO[r.nivelRiscoOperacional] ?? r.nivelRiscoOperacional}
        tagClasse={
          riscoAlto
            ? "bg-destructive/10 text-destructive"
            : r.nivelRiscoOperacional === "MEDIO"
              ? "bg-accent/25 text-accent-foreground"
              : "bg-primary/10 text-primary"
        }
        detalhe={
          riscoAlto
            ? "Cortes em políticas neste cenário podem causar dano irreversível dentro do mandato."
            : "Baixa probabilidade de paralisação dos programas em caso de contingenciamento."
        }
        borda={riscoAlto ? "border-destructive/60" : undefined}
      />
    </section>
  );
}

// Estilo do card destacado com borda vermelha usa a classe acima.
