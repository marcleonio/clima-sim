import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Eixos } from "@/components/landing/eixos"
import { Hero } from "@/components/landing/hero"
import { Metodo } from "@/components/landing/metodo"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Eixos />
        <Metodo />

        <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-16 md:px-6 md:py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            Escolha um ente, mova três controles e veja o mandato inteiro se redesenhar.
          </h2>
          <Button size="lg" nativeButton={false} render={<Link href="/painel" />}>
            Abrir o simulador
            <ArrowRight className="size-4" />
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
