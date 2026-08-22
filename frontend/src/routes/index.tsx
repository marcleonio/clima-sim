import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Building2,
  Gauge,
  Leaf,
  LineChart,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";

import heroImg from "@/assets/hero-floresta.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClimaSim — Simulador preditivo de políticas climáticas" },
      {
        name: "description",
        content:
          "ClimaSim transforma os dados do Painel ClimaBrasil em uma engine preditiva: simule financiamento, governança e execução de políticas e veja o impacto climático projetado do mandato.",
      },
      { property: "og:title", content: "ClimaSim — Simulador preditivo de políticas climáticas" },
      {
        property: "og:description",
        content:
          "De dados estáticos de auditoria a uma ferramenta viva de planejamento público, com projeções até 2028 e alertas de trade-off.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://policy-effect-simulator.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://policy-effect-simulator.lovable.app/" }],
  }),
  component: Landing,
});

const EIXOS = [
  {
    Icon: Banknote,
    titulo: "Financiamento climático",
    texto:
      "Orçamento, captação de recursos verdes e capacidade real de absorver o repasse disponível.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Governança & transparência",
    texto: "Instituições, dados abertos, controle interno e maturidade institucional do ente.",
  },
  {
    Icon: ScrollText,
    titulo: "Execução de políticas",
    texto: "Entrega efetiva dos programas climáticos e continuidade ao longo do mandato.",
  },
];

const FUNCIONALIDADES = [
  {
    Icon: Gauge,
    titulo: "Sliders de cenário",
    texto: "Variação percentual de -100% a +100% em cada eixo, com recálculo imediato.",
  },
  {
    Icon: LineChart,
    titulo: "Projeção do mandato",
    texto: "Séries temporais interpoladas ano a ano até o fim do ciclo de governo.",
  },
  {
    Icon: TriangleAlert,
    titulo: "Trade-offs automáticos",
    texto: "Matriz de impacto cruzado com alertas de ganho, perda, risco e efeito neutro.",
  },
  {
    Icon: BarChart3,
    titulo: "KPIs de decisão",
    texto: "Absorção, ROI climático, maturidade relativa e risco de descontinuidade.",
  },
];

const PUBLICOS = [
  {
    Icon: Building2,
    titulo: "Gestores públicos",
    texto:
      "Estados, municípios e União simulam cenários orçamentários antes de comprometer o PPA e a LOA.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Órgãos de controle",
    texto:
      "TCU e TCEs comparam o planejado com a capacidade real de execução de cada ente federativo.",
  },
  {
    Icon: Users,
    titulo: "Sociedade civil",
    texto:
      "Controle social acompanha se o investimento anunciado se converte em impacto climático medível.",
  },
];

function Landing() {
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Vista aérea de floresta tropical brasileira cortada por um rio ao amanhecer"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 canopy opacity-90" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground backdrop-blur">
            <Leaf className="size-3.5" /> ClimaSim · Climate Simulator
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl leading-tight text-primary-foreground md:text-6xl">
            O Painel ClimaBrasil mostra o passado. O ClimaSim projeta o próximo mandato.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/85 md:text-lg">
            Plataforma de inteligência preditiva que consome os dados oficiais de auditoria
            climática e responde à pergunta que todo gestor faz: onde aplicar o próximo milhão de
            reais para gerar o maior impacto climático?
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/achados">
                Consultar meu estado ou capital <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link to="/metodologia">Ver metodologia</Link>
            </Button>
          </div>
          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
            {[
              ["3", "eixos analisados"],
              ["4", "anos de projeção"],
              ["27+", "entes federativos"],
              ["OLS", "modelo preditivo"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-3xl text-primary-foreground">{v}</dt>
                <dd className="text-xs uppercase tracking-wider text-primary-foreground/70">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Problema */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              O problema público
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl">
              Diagnóstico não é planejamento.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Os dados do Painel ClimaBrasil são estáticos e diagnósticos: mostram como a gestão
              está hoje. Isso dificulta que gestores públicos definam metas realistas e impede que a
              sociedade preveja o efeito de cortes ou aumentos de investimento nas políticas
              climáticas.
            </p>
            <p className="mt-4 text-muted-foreground">
              O ClimaSim fecha essa lacuna: pega o mesmo dataset oficial como baseline e o
              transforma em cenários futuros calculáveis, com trade-offs explícitos e evidência
              matemática no lugar do achismo.
            </p>
          </div>
          <div className="grid gap-4">
            {EIXOS.map(({ Icon, titulo, texto }) => (
              <Card key={titulo} className="card-soft border-border/70">
                <CardContent className="flex gap-4 pt-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            O que a plataforma faz
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl">Funcionalidades do MVP</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FUNCIONALIDADES.map(({ Icon, titulo, texto }) => (
              <Card key={titulo} className="card-soft h-full border-border/70">
                <CardContent className="space-y-3 pt-6">
                  <span className="grid size-10 place-items-center rounded-xl leaf-gradient text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10">
            <Button asChild>
              <Link to="/achados">
                Gerar a peça de cobrança <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Público */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Para quem
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl">Três públicos, uma mesma evidência</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PUBLICOS.map(({ Icon, titulo, texto }) => (
            <Card key={titulo} className="card-soft h-full border-border/70">
              <CardContent className="space-y-3 pt-6">
                <Icon className="size-6 text-primary" />
                <p className="font-semibold">{titulo}</p>
                <p className="text-sm text-muted-foreground">{texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Card className="card-soft canopy border-0 text-primary-foreground">
          <CardContent className="grid gap-6 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <Sparkles className="size-6" />
              <h2 className="mt-3 text-3xl text-primary-foreground">
                Dados estáticos de auditoria viram ferramenta viva de planejamento.
              </h2>
              <p className="mt-3 max-w-2xl text-sm opacity-85">
                Pronto para ser acoplado ao portal do TCU/ClimaBrasil como apoio à elaboração de PPA
                e LOA dos entes federativos.
              </p>
            </div>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/impacto">
                Ver impacto esperado <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
