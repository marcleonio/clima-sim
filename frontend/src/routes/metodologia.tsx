import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Database, Sigma, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/metodologia")({
  head: () => ({
    meta: [
      { title: "Metodologia — ClimaSim" },
      {
        name: "description",
        content:
          "Como o ClimaSim usa os dados do Painel ClimaBrasil como baseline e aplica regressão múltipla (OLS) para projetar cenários climáticos de estados e municípios.",
      },
      { property: "og:title", content: "Metodologia — ClimaSim" },
      {
        property: "og:description",
        content:
          "Dataset oficial agregado, modelo OLS, matriz de impacto cruzado e interpolação temporal do mandato.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://policy-effect-simulator.lovable.app/metodologia" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://policy-effect-simulator.lovable.app/metodologia" }],
  }),
  component: Metodologia,
});

const ETAPAS = [
  {
    Icon: Database,
    titulo: "1. Baseline oficial",
    texto:
      "O dataset do Painel ClimaBrasil é agregado por ente federativo e vira o baseline real das notas de Financiamento, Governança e Execução de Políticas de estados e municípios.",
  },
  {
    Icon: Sigma,
    titulo: "2. Regressão múltipla (OLS)",
    texto:
      "Uma engine estatística de mínimos quadrados ordinários estima como variações percentuais em cada eixo se propagam sobre o índice climático geral do ente.",
  },
  {
    Icon: Workflow,
    titulo: "3. Matriz de impacto cruzado",
    texto:
      "Cada ajuste gera efeitos colaterais nos demais eixos — executar sem financiar, por exemplo, derruba a nota financeira. Esses efeitos viram trade-offs classificados como ganho, perda, alerta ou neutro.",
  },
  {
    Icon: ArrowRight,
    titulo: "4. Interpolação do mandato",
    texto:
      "O resultado é distribuído ano a ano até o fim do ciclo de governo, produzindo séries temporais e KPIs de absorção, ROI climático, maturidade relativa e risco de descontinuidade.",
  },
];

function Metodologia() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Como funciona
      </p>
      <h1 className="mt-3 text-4xl">Metodologia do ClimaSim</h1>
      <p className="mt-4 text-muted-foreground">
        A plataforma não inventa dados: parte do diagnóstico oficial e o projeta no tempo. Abaixo, o
        caminho completo do dado bruto até a projeção exibida no simulador.
      </p>

      <div className="mt-10 grid gap-5">
        {ETAPAS.map(({ Icon, titulo, texto }) => (
          <Card key={titulo} className="card-soft border-border/70">
            <CardContent className="flex gap-4 pt-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-14 text-2xl">Indicadores calculados</h2>
      <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">Capacidade de absorção</strong> — quanto do recurso
          adicional o ente consegue de fato executar, evitando gargalos de caixa.
        </li>
        <li>
          <strong className="text-foreground">ROI climático e fator de alavancagem</strong> — retorno
          esperado por ponto percentual investido em cada eixo.
        </li>
        <li>
          <strong className="text-foreground">Maturidade relativa</strong> — posição do ente frente
          aos pares da mesma esfera.
        </li>
        <li>
          <strong className="text-foreground">Risco de descontinuidade</strong> — probabilidade de a
          política perder tração ao longo do mandato.
        </li>
      </ul>

      <h2 className="mt-14 text-2xl">Fontes e referências</h2>
      <ul className="mt-4 grid gap-2 text-sm">
        <li>
          <a
            className="text-primary underline underline-offset-4"
            href="https://sites.tcu.gov.br/climatonbrasil/"
            target="_blank"
            rel="noreferrer"
          >
            Climaton Brasil — TCU
          </a>
        </li>
        <li>
          <a
            className="text-primary underline underline-offset-4"
            href="https://climatescanner.org/pt/panorama-local-do-brasil/estados/"
            target="_blank"
            rel="noreferrer"
          >
            ClimateScanner — Panorama local do Brasil (estados)
          </a>
        </li>
      </ul>

      <div className="mt-12">
        <Button asChild>
          <Link to="/simulador">
            Testar no simulador <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
