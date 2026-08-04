"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { SeriesTemporaisResponse } from "@/lib/types"

const CORES_TOKEN = ["var(--chart-3)", "var(--chart-1)", "var(--chart-2)", "var(--chart-4)"]

export function GraficoProjecao({
  series,
  carregando,
}: {
  series?: SeriesTemporaisResponse
  carregando: boolean
}) {
  if (carregando || !series?.linhasGrafico?.length) {
    return (
      <section className="flex flex-col gap-4 border border-border bg-card p-5 md:p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[280px] w-full" />
      </section>
    )
  }

  const chaves = series.linhasGrafico.map((_, i) => `serie${i}`)

  const config: ChartConfig = Object.fromEntries(
    series.linhasGrafico.map((linha, i) => [
      chaves[i],
      { label: linha.nomeLinha, color: CORES_TOKEN[i % CORES_TOKEN.length] },
    ]),
  )

  const dados = series.labelsAnos.map((ano, indice) => {
    const ponto: Record<string, string | number> = { ano }
    series.linhasGrafico.forEach((linha, i) => {
      ponto[chaves[i]] = linha.valoresAnoAAno[indice]
    })
    return ponto
  })

  const valores = series.linhasGrafico.flatMap((l) => l.valoresAnoAAno)
  const min = Math.max(0, Math.floor((Math.min(...valores) - 6) / 5) * 5)
  const max = Math.min(100, Math.ceil((Math.max(...valores) + 6) / 5) * 5)

  return (
    <section
      aria-labelledby="titulo-grafico"
      className="flex flex-col gap-5 border border-border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-grafico" className="text-sm font-medium">
          Trajetória ano a ano
        </h2>
        <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          score geral · escala 0–100
        </span>
      </div>

      <ChartContainer config={config} className="h-[300px] w-full">
        <LineChart data={dados} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="ano"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            className="font-mono text-xs"
          />
          <YAxis
            domain={[min, max]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={34}
            className="font-mono text-xs"
          />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(v) => `Ano ${v}`} />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {chaves.map((chave, i) => (
            <Line
              key={chave}
              dataKey={chave}
              type="monotone"
              stroke={`var(--color-${chave})`}
              strokeWidth={2}
              strokeDasharray={i === 0 ? "5 4" : undefined}
              dot={{ r: 3, strokeWidth: 0, fill: `var(--color-${chave})` }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </section>
  )
}
