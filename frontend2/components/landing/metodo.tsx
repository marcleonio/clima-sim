import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const ETAPAS = [
  {
    titulo: "Entrada",
    texto:
      "Você escolhe um estado ou município e desloca cada eixo entre -100% e +100% em relação à nota atual registrada na base.",
  },
  {
    titulo: "Modelo",
    texto:
      "A ClimaUtils API aplica a regressão OLS sobre os coeficientes históricos, incluindo os efeitos cruzados entre eixos e a maturação das políticas ao longo do mandato.",
  },
  {
    titulo: "Saída",
    texto:
      "O painel devolve a projeção ano a ano, o score final, o diagnóstico e a lista de trade-offs — os efeitos colaterais que o ajuste provoca em outro eixo.",
  },
]

export function Metodo() {
  return (
    <section id="metodo" className="scroll-mt-16 border-b border-border bg-secondary/50">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:px-6 md:py-20 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Como o cálculo funciona
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            Do ajuste percentual à projeção de quatro anos.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O simulador não promete o futuro. Ele mostra a consequência aritmética de uma escolha
            orçamentária mantida por um mandato inteiro — e o preço que ela cobra em outro lugar.
          </p>
          <Button
            variant="outline"
            className="mt-2 self-start"
            nativeButton={false}
            render={<Link href="/painel" />}
          >
            Ir para o painel
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <ol className="flex flex-col divide-y divide-border border-y border-border">
          {ETAPAS.map((etapa) => (
            <li key={etapa.titulo} className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <h3 className="font-mono text-[11px] tracking-widest text-primary uppercase sm:pt-1">
                {etapa.titulo}
              </h3>
              <p className="text-sm leading-relaxed text-pretty">{etapa.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
