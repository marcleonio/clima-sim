import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { MetadadosResponse, ResumoScoreResponse } from "@/lib/types"

const STATUS_LABEL: Record<string, string> = {
  AVANCO_ACELERADO: "Avanço acelerado",
  AVANCO_MODERADO: "Avanço moderado",
  ESTAVEL: "Estável",
  RETROCESSO_MODERADO: "Retrocesso moderado",
  RETROCESSO_CRITICO: "Retrocesso crítico",
}

function rotuloStatus(status: string) {
  return (
    STATUS_LABEL[status] ??
    status
      .replace(/_/g, " ")
      .toLocaleLowerCase("pt-BR")
      .replace(/^./, (c) => c.toLocaleUpperCase("pt-BR"))
  )
}

export function ResumoScore({
  resumo,
  metadados,
  carregando,
}: {
  resumo?: ResumoScoreResponse
  metadados?: MetadadosResponse
  carregando: boolean
}) {
  if (carregando || !resumo) {
    return (
      <section className="flex flex-col gap-6 border border-border bg-card p-5 md:p-6">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-wrap gap-10">
          <Skeleton className="h-16 w-28" />
          <Skeleton className="h-16 w-28" />
          <Skeleton className="h-16 w-28" />
        </div>
        <Skeleton className="h-10 w-full" />
      </section>
    )
  }

  const variacao = resumo.variacaoPercentual
  const Icone = variacao > 0.5 ? ArrowUpRight : variacao < -0.5 ? ArrowDownRight : ArrowRight
  const corVariacao =
    variacao > 0.5 ? "text-primary" : variacao < -0.5 ? "text-destructive" : "text-muted-foreground"

  return (
    <section
      aria-labelledby="titulo-resumo"
      aria-live="polite"
      className="flex flex-col gap-6 border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-resumo" className="text-sm font-medium">
          Projeção ao fim do mandato
          {metadados?.entidadeSelecionada ? ` — ${metadados.entidadeSelecionada}` : ""}
        </h2>
        <span className="border border-border px-2 py-0.5 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          {rotuloStatus(resumo.statusGeral)}
        </span>
      </div>

      <dl className="flex flex-wrap items-end gap-x-10 gap-y-6">
        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Score atual
          </dt>
          <dd className="font-mono text-3xl leading-none tabular-nums md:text-4xl">
            {resumo.scoreGeralAtual.toFixed(1)}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Score projetado
          </dt>
          <dd className="font-mono text-3xl leading-none tabular-nums text-primary md:text-4xl">
            {resumo.scoreGeralProjetado.toFixed(1)}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Variação
          </dt>
          <dd className={`flex items-center gap-1 font-mono text-3xl leading-none tabular-nums md:text-4xl ${corVariacao}`}>
            <Icone className="size-6" aria-hidden="true" />
            {variacao > 0 ? "+" : ""}
            {variacao.toFixed(1)}%
          </dd>
        </div>
      </dl>

      <p className="border-t border-border pt-4 text-sm leading-relaxed text-pretty">
        {resumo.mensagemDiagnostico}
      </p>
    </section>
  )
}
