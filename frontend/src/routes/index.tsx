import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Landmark,
  Leaf,
  Minus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import heroImg from "@/assets/hero-floresta.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendChart } from "@/components/clima/trend-chart";
import {
  DEFAULT_BASE_URL,
  getApiBaseUrl,
  listarEntidades,
  recalcular,
  setApiBaseUrl,
  type EntityScores,
  type SimulacaoResponse,
  type Source,
  TIPOS_ENTIDADE,
  normalizarTipoEntidade,
  type TipoEntidade,
} from "@/lib/clima-api";
import type { TradeOffTipo } from "@/lib/clima-api";

// Enum TradeOffResponse.tipo da API: GANHO | PERDA | ALERTA | NEUTRO
const TRADEOFF_ESTILO: Record<
  TradeOffTipo,
  { rotulo: string; classe: string; icone: typeof Leaf }
> = {
  GANHO: { rotulo: "Ganho", classe: "bg-primary/10 text-primary", icone: Leaf },
  PERDA: {
    rotulo: "Perda",
    classe: "bg-destructive/10 text-destructive",
    icone: ArrowDownRight,
  },
  ALERTA: {
    rotulo: "Alerta",
    classe: "bg-accent/20 text-accent-foreground",
    icone: TriangleAlert,
  },
  NEUTRO: {
    rotulo: "Neutro",
    classe: "bg-secondary text-secondary-foreground",
    icone: Landmark,
  },
};



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel ClimaBrasil — Simulador de Políticas Climáticas" },
      {
        name: "description",
        content:
          "Simule como mudanças em financiamento, governança e execução de políticas públicas afetam o índice climático de estados e municípios brasileiros ao longo de 4 anos.",
      },
      { property: "og:title", content: "Painel ClimaBrasil — Simulador de Políticas Climáticas" },
      {
        property: "og:description",
        content:
          "Projeções de 4 anos e trade-offs entre financiamento climático, governança e execução de políticas públicas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

const EIXOS = [
  {
    key: "ajusteFinanciamento" as const,
    nome: "Financiamento Climático",
    desc: "Orçamento e captação de recursos verdes",
    Icon: Banknote,
  },
  {
    key: "ajusteGovernanca" as const,
    nome: "Governança & Transparência",
    desc: "Instituições, dados abertos e controle",
    Icon: ShieldCheck,
  },
  {
    key: "ajustePoliticas" as const,
    nome: "Execução de Políticas",
    desc: "Entrega efetiva de programas climáticos",
    Icon: ScrollText,
  },
];

function Painel() {
  const [entidades, setEntidades] = useState<EntityScores[]>([]);
  const [esfera, setEsfera] = useState<TipoEntidade>("Estadual");
  const [nome, setNome] = useState<string>("");
  const [ajustes, setAjustes] = useState({
    ajusteFinanciamento: 15,
    ajusteGovernanca: 0,
    ajustePoliticas: 20,
  });
  const [sim, setSim] = useState<SimulacaoResponse | null>(null);
  const [source, setSource] = useState<Source>("demo");
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBaseUrl(getApiBaseUrl());
  }, []);

  const carregar = useCallback(async () => {
    const { data } = await listarEntidades();
    const lista = Object.values(data);
    setEntidades(lista);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const entidadesDaEsfera = useMemo(
    () => entidades.filter((e) => normalizarTipoEntidade(e.entityType) === esfera),
    [entidades, esfera],
  );

  useEffect(() => {
    if (!entidadesDaEsfera.some((e) => e.entityName === nome)) {
      setNome(entidadesDaEsfera[0]?.entityName ?? (esfera === "Federal" ? "Brasil" : ""));
    }
  }, [entidadesDaEsfera, esfera, nome]);

  const entidade = useMemo(
    () => entidadesDaEsfera.find((e) => e.entityName === nome),
    [entidadesDaEsfera, nome],
  );

  const simular = useCallback(async () => {
    if (!entidade && !(esfera === "Federal" && nome)) return;
    setLoading(true);
    const { data, source: s } = await recalcular({
      tipoEntidade: esfera,
      nomeEntidade: entidade?.entityName ?? nome,
      ...ajustes,
    });
    setSim(data);
    setSource(s);
    setLoading(false);
  }, [entidade, esfera, nome, ajustes]);

  useEffect(() => {
    if (nome) void simular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, esfera]);

  const variacao = sim?.resumo.variacaoPercentual ?? 0;

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
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
            <Leaf className="size-3.5" /> Painel ClimaBrasil
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl leading-tight text-primary-foreground md:text-6xl">
            O clima responde às escolhas de política pública.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/85 md:text-lg">
            Ajuste financiamento, governança e execução de políticas e veja, ano a ano, o impacto
            projetado sobre o índice climático de estados e municípios — com os trade-offs que cada
            decisão carrega.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => painelRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              Simular um mandato <ArrowRight className="size-4" />
            </Button>
          </div>
          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
            {[
              ["3", "eixos analisados"],
              ["4", "anos de projeção"],
              [String(entidades.length || "—"), "entes federativos"],
              ["OLS", "modelo preditivo"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-3xl text-primary-foreground">{v}</dt>
                <dd className="text-xs uppercase tracking-wider text-primary-foreground/70">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div ref={painelRef} className="mx-auto max-w-6xl scroll-mt-8 px-6 py-16">
        {/* Controles */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="card-soft border-border/70">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xl">Cenário de mandato</CardTitle>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  source === "api"
                    ? "bg-primary/10 text-primary"
                    : "bg-earth/15 text-earth"
                }`}
              >
                {source === "api" ? "API conectada" : "Modo demonstração"}
              </span>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-2">
                <Label>Esfera da entidade</Label>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary p-1">
                  {TIPOS_ENTIDADE.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEsfera(t)}
                      aria-pressed={esfera === t}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        esfera === t
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>
                  {esfera === "Federal"
                    ? "Órgão ou ente federal"
                    : esfera === "Estadual"
                      ? "Estado"
                      : "Município"}
                </Label>
                {entidadesDaEsfera.length ? (
                  <Select value={nome} onValueChange={setNome}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma entidade" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {entidadesDaEsfera.map((e) => (
                        <SelectItem key={e.entityName} value={e.entityName}>
                          {e.entityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={nome}
                    onChange={(ev) => setNome(ev.target.value)}
                    onBlur={() => void simular()}
                    placeholder={esfera === "Federal" ? "Brasil" : "Nome da entidade"}
                  />
                )}
              </div>

              {EIXOS.map(({ key, nome: n, desc, Icon }) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{n}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <span className="font-display text-lg tabular-nums">
                      {ajustes[key] > 0 ? "+" : ""}
                      {ajustes[key]}%
                    </span>
                  </div>
                  <Slider
                    value={[ajustes[key]]}
                    min={-100}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setAjustes((a) => ({ ...a, [key]: v ?? 0 }))}
                  />
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button onClick={() => void simular()} disabled={loading || !entidade}>
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  Recalcular projeções
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setAjustes({ ajusteFinanciamento: 0, ajusteGovernanca: 0, ajustePoliticas: 0 })
                  }
                >
                  Zerar ajustes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card className="card-soft canopy border-0 text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-widest opacity-80">
                Índice climático geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-end gap-3">
                <span className="font-display text-6xl leading-none">
                  {sim?.resumo.scoreGeralProjetado.toFixed(1) ?? "—"}
                </span>
                <span className="pb-2 text-sm opacity-75">
                  de {sim?.resumo.scoreGeralAtual.toFixed(1) ?? "—"} hoje
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold ${
                  variacao < -0.5 ? "opacity-90" : ""
                }`}
              >
                {variacao > 0.5 ? (
                  <ArrowUpRight className="size-4" />
                ) : variacao < -0.5 ? (
                  <ArrowDownRight className="size-4" />
                ) : (
                  <Minus className="size-4" />
                )}
                {variacao > 0 ? "+" : ""}
                {variacao}% em 4 anos
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                {sim?.resumo.mensagemDiagnostico ?? "Selecione uma entidade para simular."}
              </p>
              <div className="rounded-xl bg-primary-foreground/10 p-3 text-xs opacity-80">
                Status geral:{" "}
                <strong className="font-semibold">{sim?.resumo.statusGeral ?? "—"}</strong>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* KPIs por eixo */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {sim?.kpisEixos.map((kpi) => {
            const delta = kpi.scoreProjetado - kpi.scoreAtual;
            return (
              <Card key={kpi.chaveEixo} className="card-soft border-border/70">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{kpi.nomeExibicao}</p>
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: kpi.corSugestaoHex }}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-display text-4xl leading-none">
                      {kpi.scoreProjetado.toFixed(1)}
                    </span>
                    <span
                      className={`pb-1 text-sm font-semibold ${
                        delta >= 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${kpi.scoreProjetado}%`,
                        backgroundColor: kpi.corSugestaoHex,
                      }}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Hoje {kpi.scoreAtual.toFixed(1)} · tendência {kpi.tendencia.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Série temporal */}
        {sim && (
          <Card className="card-soft mt-10 border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Projeção ano a ano do mandato</CardTitle>
              <p className="text-sm text-muted-foreground">
                {sim.metadados.entidadeSelecionada} ·{" "}
                {normalizarTipoEntidade(sim.metadados.tipoEntidade)}
              </p>
            </CardHeader>
            <CardContent>
              <TrendChart series={sim.seriesTemporais} />
            </CardContent>
          </Card>
        )}

        {/* Trade-offs */}
        {sim && (
          <section className="mt-10">
            <h2 className="text-2xl">Trade-offs identificados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Toda escolha climática desloca recursos de outro eixo. O modelo destaca os efeitos
              cruzados mais relevantes deste cenário.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sim.listaTradeOffs.map((t, i) => {
                const estilo = TRADEOFF_ESTILO[t.tipo] ?? TRADEOFF_ESTILO["NEUTRO"];
                const Icone = estilo.icone;
                return (
                <Card key={i} className="card-soft border-border/70">
                  <CardContent className="flex gap-4 pt-6">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${estilo.classe}`}
                    >
                      <Icone className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {estilo.rotulo} · {t.eixoAfetado}
                      </p>
                      <p className="mt-1 font-semibold">{t.titulo}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {t.descricaoAmigavel}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Conexão com a API */}
        <section className="mt-14">
          <Card className="border-dashed border-border">
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="api">Endereço da ClimaUtils API</Label>
                <Input
                  id="api"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                />
                <p className="text-xs text-muted-foreground">
                  Enquanto a API não responder, o painel usa um motor de simulação local
                  equivalente para demonstração.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setApiBaseUrl(baseUrl);
                  void carregar().then(() => simular());
                }}
              >
                Conectar
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <footer className="canopy mt-8 py-10 text-center text-sm text-primary-foreground/80">
        Painel ClimaBrasil · simulação preditiva de políticas climáticas
      </footer>
    </main>
  );
}
