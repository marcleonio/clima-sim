import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ShieldCheck, Target, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/impacto")({
  head: () => ({
    meta: [
      { title: "Impacto e público — ClimaSim" },
      {
        name: "description",
        content:
          "Benefícios esperados do ClimaSim: prevenção de gargalos orçamentários, decisões baseadas em evidência e apoio direto à elaboração de PPA e LOA dos entes federativos.",
      },
      { property: "og:title", content: "Impacto e público — ClimaSim" },
      {
        property: "og:description",
        content:
          "Gestores públicos, órgãos de controle e sociedade civil usando a mesma evidência preditiva sobre política climática.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://policy-effect-simulator.lovable.app/impacto" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://policy-effect-simulator.lovable.app/impacto" }],
  }),
  component: Impacto,
});

const PUBLICOS = [
  {
    Icon: Building2,
    titulo: "Gestores públicos",
    texto:
      "Tomadores de decisão em governos federal, estaduais e municipais simulam cenários orçamentários antes de comprometer recursos.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Órgãos de controle",
    texto:
      "TCU e TCEs monitoram e cobram impacto real dos investimentos, comparando promessa e capacidade de execução.",
  },
  {
    Icon: Users,
    titulo: "Sociedade civil",
    texto:
      "Controle social com linguagem acessível: o que muda no clima quando o orçamento sobe ou é cortado.",
  },
];

const BENEFICIOS = [
  {
    Icon: TrendingUp,
    titulo: "Prevenção de gargalos orçamentários",
    texto:
      "Detecta perda de repasses ou falta de capacidade de absorção de caixa antes que o problema aconteça.",
  },
  {
    Icon: Target,
    titulo: "Decisão baseada em evidência",
    texto:
      "Substitui o achismo por evidência matemática sobre dados oficiais de auditoria climática.",
  },
];

function Impacto() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Valor entregue
      </p>
      <h1 className="mt-3 text-4xl">Impacto, público e aplicação prática</h1>
      <p className="mt-4 text-muted-foreground">
        O ClimaSim nasce de uma pergunta simples: o Painel ClimaBrasil mostra o passado e o
        presente, mas como um gestor público sabe onde aplicar o próximo milhão de reais para gerar
        o maior impacto climático no seu mandato?
      </p>

      <h2 className="mt-12 text-2xl">Quem utiliza</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
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

      <h2 className="mt-12 text-2xl">Benefícios esperados</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {BENEFICIOS.map(({ Icon, titulo, texto }) => (
          <Card key={titulo} className="card-soft h-full border-border/70">
            <CardContent className="space-y-3 pt-6">
              <Icon className="size-6 text-primary" />
              <p className="font-semibold">{titulo}</p>
              <p className="text-sm text-muted-foreground">{texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 text-2xl">Potencial de aplicação</h2>
      <p className="mt-3 text-muted-foreground">
        Ferramenta pronta para ser acoplada diretamente ao portal do TCU/ClimaBrasil, apoiando a
        elaboração do Plano Plurianual (PPA) e da Lei Orçamentária Anual (LOA) dos entes
        federativos — com projeção do mandato até 2028 e alertas automáticos de risco.
      </p>

      <Card className="card-soft canopy mt-12 border-0 text-primary-foreground">
        <CardContent className="py-10">
          <h2 className="text-2xl text-primary-foreground">
            Transformamos dados estáticos de auditoria em uma ferramenta viva de planejamento
            público.
          </h2>
          <div className="mt-6">
            <Button variant="secondary" asChild>
              <Link to="/simulador">
                Abrir o simulador <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
