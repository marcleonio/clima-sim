import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { KpiEixoResponse } from "@/lib/types"

function tendenciaVisual(kpi: KpiEixoResponse) {
  const delta = kpi.scoreProjetado - kpi.scoreAtual
  if (delta > 0.5) return { Icone: TrendingUp, cor: "text-primary", rotulo: "em alta" }
  if (delta < -0.5) return { Icone: TrendingDown, cor: "text-destructive", rotulo: "em queda" }
  return { Icone: Minus, cor: "text-muted-foreground", rotulo: "estável" }
}

export function KpisEixos({ kpis, carregando }: { kpis?: KpiEixoResponse[]; carregando: boolean }) {
  if (carregando || !kpis?.length) {
    return (
      <ul className="grid gap-px bg-border sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex flex-col gap-3 bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-1.5 w-full" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul aria-label="Projeção por eixo" className="grid gap-px bg-border sm:grid-cols-3">
      {kpis.map((kpi) => {
        const { Icone, cor, rotulo } = tendenciaVisual(kpi)
        const delta = kpi.scoreProjetado - kpi.scoreAtual
        return (
          <li key={kpi.chaveEixo} className="flex flex-col gap-4 bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs leading-relaxed font-medium text-muted-foreground">
                {kpi.nomeExibicao}
              </h3>
              <Icone className={`size-4 shrink-0 ${cor}`} aria-hidden="true" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl leading-none tabular-nums">
                {kpi.scoreProjetado.toFixed(1)}
              </span>
              <span className={`font-mono text-xs tabular-nums ${cor}`}>
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}
              </span>
              <span className="sr-only">{`${kpi.nomeExibicao} ${rotulo}`}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="relative h-1.5 w-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 bg-muted-foreground/50"
                  style={{ width: `${kpi.scoreAtual}%` }}
                />
                <div
                  className={`absolute inset-y-0 left-0 ${delta < -0.5 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(kpi.scoreProjetado, kpi.scoreAtual)}%` }}
                />
                <div
                  className={`absolute inset-y-0 ${delta < -0.5 ? "bg-destructive/30" : "bg-primary"}`}
                  style={{
                    left: `${Math.min(kpi.scoreAtual, kpi.scoreProjetado)}%`,
                    width: `${Math.abs(delta)}%`,
                  }}
                />
              </div>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                base {kpi.scoreAtual.toFixed(1)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
