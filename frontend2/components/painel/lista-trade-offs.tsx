import { AlertTriangle, CheckCircle2, CircleDashed, Info, TriangleAlert } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { TradeOffResponse } from "@/lib/types"

const ESTILOS: Record<string, { Icone: typeof Info; cor: string; rotulo: string }> = {
  RISCO: { Icone: TriangleAlert, cor: "text-destructive", rotulo: "Risco" },
  ALERTA: { Icone: AlertTriangle, cor: "text-accent", rotulo: "Alerta" },
  GARGALO: { Icone: AlertTriangle, cor: "text-accent", rotulo: "Gargalo" },
  GANHO: { Icone: CheckCircle2, cor: "text-primary", rotulo: "Ganho" },
  NEUTRO: { Icone: CircleDashed, cor: "text-muted-foreground", rotulo: "Neutro" },
}

export function ListaTradeOffs({
  tradeOffs,
  carregando,
}: {
  tradeOffs?: TradeOffResponse[]
  carregando: boolean
}) {
  return (
    <section
      aria-labelledby="titulo-trade-offs"
      className="flex flex-col gap-5 border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-trade-offs" className="text-sm font-medium">
          Trade-offs do cenário
        </h2>
        <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          efeitos cruzados entre eixos
        </span>
      </div>

      {carregando ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : !tradeOffs?.length ? (
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Nenhum trade-off relevante identificado para esta combinação de ajustes.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {tradeOffs.map((item, indice) => {
            const estilo = ESTILOS[item.tipo?.toLocaleUpperCase("pt-BR")] ?? ESTILOS.NEUTRO
            return (
              <li key={`${item.titulo}-${indice}`} className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
                <estilo.Icone className={`mt-0.5 size-4 shrink-0 ${estilo.cor}`} aria-hidden="true" />
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h3 className="text-sm font-medium">{item.titulo}</h3>
                    <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                      {estilo.rotulo} · {item.eixoAfetado}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                    {item.descricaoAmigavel}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
