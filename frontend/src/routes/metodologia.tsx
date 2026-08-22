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
          "Como o ClimaSim transforma os pareceres de auditoria do Painel ClimaBrasil em achados, priorização multicritério e peças administrativas prontas para protocolar.",
      },
      { property: "og:title", content: "Metodologia — ClimaSim" },
      {
        property: "og:description",
        content:
          "Base oficial do TCU, escala de quatro degraus, priorização multicritério decomponível e trajetória por aritmética da escala.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://policy-effect-simulator.lovable.app/metodologia" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Metodologia,
});

const ETAPAS = [
  {
    Icon: Database,
    titulo: "1. A base oficial, inteira",
    texto:
      "O CSV do Painel ClimaBrasil traz 2.295 avaliações em 51 entes — 26 estados, 24 capitais e o Distrito Federal —, cada uma com o parecer técnico que o auditor do tribunal de contas escreveu. É esse parecer, e não a nota, que o produto entrega.",
  },
  {
    Icon: Sigma,
    titulo: "2. A escala de quatro degraus",
    texto:
      "Cada requisito recebe Sem progresso, Estágio inicial, Estágio intermediário ou Estágio avançado, valendo 0, 1/3, 2/3 e 1. O índice do ente é a média desses valores. Um requisito em “Sem progresso” é o que chamamos de achado.",
  },
  {
    Icon: Workflow,
    titulo: "3. Priorização multicritério",
    texto:
      "Cada par ente × componente recebe um índice por soma ponderada de cinco critérios: déficit, exposição populacional, vínculo normativo, alavancagem e precedente disponível. A soma ponderada foi escolhida por ser a única que se decompõe linearmente — toda prioridade mostra a contribuição de cada critério.",
  },
  {
    Icon: ArrowRight,
    titulo: "4. Trajetória de regularização",
    texto:
      "Como o índice é a média dos degraus, o efeito de fazer um requisito subir um degrau é aritmética exata — sem modelo estatístico e sem parâmetro estimado. Qualquer pessoa reproduz o número com a planilha na mão.",
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
        A plataforma não inventa dados. Todo texto exibido ou vem da fonte oficial — parecer da
        auditoria, base normativa, dados do ente — ou é fórmula administrativa padrão. Abaixo, o
        caminho completo do CSV bruto até a peça pronta para protocolar.
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

      <h2 className="mt-14 text-2xl">Limites que assumimos</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Um produto de controle externo vale pelo que se recusa a afirmar.
      </p>
      <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">Não medimos risco físico.</strong> A formulação correta
          é “vive sob jurisdição de ente com lacuna no requisito X”, nunca “está em risco”. A métrica
          mede lacuna de governança.
        </li>
        <li>
          <strong className="text-foreground">Não afirmamos causalidade.</strong> A avaliação de 2025
          é posterior aos eventos climáticos citados; coincidência documentada não é causa.
        </li>
        <li>
          <strong className="text-foreground">Não estimamos custo.</strong> Não há dado na base que
          diga quanto custa fazer um requisito subir um degrau, e por isso o produto não projeta
          orçamento nem retorno de investimento.
        </li>
        <li>
          <strong className="text-foreground">Os pesos da priorização são escolha, não descoberta.</strong>{" "}
          Ficam visíveis, editáveis, e são registrados em toda peça emitida.
        </li>
        <li>
          <strong className="text-foreground">O vínculo normativo pede curadoria jurídica.</strong> A
          classificação das bases legais entre vinculante e programática é uma leitura de primeira
          ordem, e está marcada como tal no código.
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
          <Link to="/achados">
            Ver os achados <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
