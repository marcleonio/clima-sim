import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ENTIDADES_BASE } from "@/lib/entidades-base"

const DESTAQUES = ["São Paulo", "Ceará", "Pará", "Roraima"]

export function Hero() {
  const amostra = DESTAQUES.map(
    (nome) => ENTIDADES_BASE.find((e) => e.entityName === nome && e.entityType === "ESTADO")!,
  )

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-lines opacity-60" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col items-start gap-6">
          <span className="border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-[11px] tracking-widest text-primary uppercase">
            Simulação preditiva de mandato
          </span>

          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Toda decisão de orçamento é uma decisão climática.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            O Painel ClimaBrasil mede estados e municípios em três eixos — financiamento climático,
            governança e execução de políticas públicas — e projeta, ano a ano, onde cada ente chega
            ao fim dos quatro anos de mandato.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/painel" />}>
              Simular um cenário
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="ghost" nativeButton={false} render={<Link href="#metodo" />}>
              Entender o modelo
            </Button>
          </div>
        </div>

        <div className="border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <h2 className="text-sm font-medium">Notas atuais por eixo</h2>
            <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              escala 0–100
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-border">
            {amostra.map((entidade) => (
              <li key={entidade.entityId} className="flex flex-col gap-2 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">{entidade.entityName}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {entidade.scoreGeralMedia.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { rotulo: "Financiamento", valor: entidade.scoreFinanciamento, cor: "bg-chart-1" },
                    { rotulo: "Governança", valor: entidade.scoreGovernanca, cor: "bg-chart-2" },
                    { rotulo: "Políticas", valor: entidade.scorePoliticasPublicas, cor: "bg-chart-4" },
                  ].map((eixo) => (
                    <div key={eixo.rotulo} className="flex-1">
                      <div className="h-1.5 w-full bg-muted">
                        <div
                          className={`h-full ${eixo.cor}`}
                          style={{ width: `${eixo.valor}%` }}
                          role="img"
                          aria-label={`${eixo.rotulo}: ${eixo.valor.toFixed(1)} de 100`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3">
            {[
              { rotulo: "Financiamento", cor: "bg-chart-1" },
              { rotulo: "Governança", cor: "bg-chart-2" },
              { rotulo: "Políticas", cor: "bg-chart-4" },
            ].map((eixo) => (
              <span key={eixo.rotulo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden="true" className={`size-2 ${eixo.cor}`} />
                {eixo.rotulo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
