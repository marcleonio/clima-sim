import type { Metadata } from "next"
import { PainelSimulacao } from "@/components/painel/painel-simulacao"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Simulador de mandato — Painel ClimaBrasil",
  description:
    "Ajuste financiamento climático, governança e execução de políticas públicas e veja a projeção do score climático ano a ano.",
}

export default function PainelPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader variante="painel" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-2 pb-8">
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Simulador de mandato · 2027–2030
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Simulação preditiva de política climática
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Escolha um ente federativo, ajuste os três eixos e acompanhe a projeção do score geral,
            a trajetória ano a ano e os trade-offs provocados por cada escolha.
          </p>
        </div>
        <PainelSimulacao />
      </main>
      <SiteFooter />
    </div>
  )
}
