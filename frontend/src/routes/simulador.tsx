import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ChevronDown,
  ChevronUp,
  FileDown,
  Landmark,
  Leaf,
  Minus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendChart } from "@/components/clima/trend-chart";
import { AxisBarChart, AxisRadarChart } from "@/components/clima/axis-charts";
import { ScoreHeatmap } from "@/components/clima/state-heatmap";
import { KpiStrip } from "@/components/clima/kpi-strip";
import { EvidenciaPainel } from "@/components/clima/evidencia-painel";
import { EvolutionChart } from "@/components/clima/evolution-chart";
import { CsvUploadCard } from "@/components/clima/csv-upload-card";
import { exportarRelatorioPdf } from "@/lib/clima-pdf";
import {
  DEFAULT_BASE_URL,
  getApiBaseUrl,
  listarEntidades,
  listarEvidencias,
  buscarEvolucao,
  recalcular,
  setApiBaseUrl,
  type EntityScores,
  type EvidenciaItem,
  type EvolutionChartData,
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

// Abas válidas da página - usadas para deep-linking a partir do menu (ex.: /simulador?tab=evolucao).
const ABAS = ["cenario", "indicadores", "projecoes", "tradeoffs", "evolucao", "conexao"] as const;
type Aba = (typeof ABAS)[number];

export const Route = createFileRoute("/simulador")({
  validateSearch: (search: Record<string, unknown>): { tab?: Aba } => {
    const tab = search["tab"];
    return typeof tab === "string" && (ABAS as readonly string[]).includes(tab)
      ? { tab: tab as Aba }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Simulador de cenários — ClimaSim" },
      {
        name: "description",
        content:
          "Simule ajustes de financiamento, governança e execução de políticas e veja a projeção de 4 anos do índice climático de estados e municípios brasileiros.",
      },
      { property: "og:title", content: "Simulador de cenários — ClimaSim" },
      {
        property: "og:description",
        content:
          "Engine preditiva OLS com sliders de -100% a +100%, séries temporais do mandato e trade-offs em tempo real.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://policy-effect-simulator.lovable.app/simulador" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://policy-effect-simulator.lovable.app/simulador" }],
  }),
  component: Simulador,
});

// Nomes alinhados aos 3 pilares do ClimateScanner
function rotuloPilar(kpi: { chaveEixo: string; nomeExibicao: string }) {
  const k = `${kpi.chaveEixo} ${kpi.nomeExibicao}`.toLowerCase();
  if (k.includes("govern")) return "Governança";
  if (k.includes("financ")) return "Financiamento";
  if (k.includes("polit") || k.includes("polít")) return "Políticas Públicas";
  return kpi.nomeExibicao;
}

// O campo "eixo" que vem do CSV de evidências ("Financiamento", "Governança",
// "Políticas públicas") não bate exatamente com o rótulo de exibição do KPI
// (maiúsculas/acentuação) - compara pela mesma palavra-chave usada em rotuloPilar.
function evidenciaPertenceAoKpi(
  eixoEvidencia: string,
  kpi: { chaveEixo: string; nomeExibicao: string },
) {
  const e = eixoEvidencia.toLowerCase();
  const pilar = rotuloPilar(kpi);
  if (pilar === "Governança") return e.includes("govern");
  if (pilar === "Financiamento") return e.includes("financ");
  if (pilar === "Políticas Públicas") return e.includes("polit") || e.includes("polít");
  return false;
}

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

function Simulador() {
  const { tab } = Route.useSearch();
  const [aba, setAba] = useState<Aba>(tab ?? "cenario");

  // Permite entrar direto numa aba a partir de um link externo (ex.: item de menu para
  // /simulador?tab=evolucao) - mesmo quando o usuário já está nesta página e o componente
  // não remonta.
  useEffect(() => {
    if (tab) setAba(tab);
  }, [tab]);

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
  const [evolucao, setEvolucao] = useState<EvolutionChartData | null>(null);

  // Evidências (comentários originais dos auditores) - carregadas sob demanda, uma vez
  // por entidade, e reaproveitadas entre as 3 abas de eixo enquanto o usuário não trocar
  // de estado/município.
  const [evidenciasPorEntidade, setEvidenciasPorEntidade] = useState<
    Record<string, EvidenciaItem[]>
  >({});
  const [eixosComEvidenciaAberta, setEixosComEvidenciaAberta] = useState<Set<string>>(new Set());
  const [carregandoEvidencias, setCarregandoEvidencias] = useState(false);

  useEffect(() => {
    setBaseUrl(getApiBaseUrl());
  }, []);

  const carregar = useCallback(async () => {
    const { data } = await listarEntidades();
    setEntidades(Object.values(data));
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const entidadesDaEsfera = useMemo(
    () =>
      entidades
        .filter((e) => normalizarTipoEntidade(e.entityType) === esfera)
        .sort((a, b) => a.entityName.localeCompare(b.entityName, "pt-BR")),
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

  const carregarEvolucao = useCallback(async () => {
    if (entidade?.entityId === undefined) {
      setEvolucao(null);
      return;
    }
    setEvolucao(await buscarEvolucao(entidade.entityId));
  }, [entidade]);

  useEffect(() => {
    void carregarEvolucao();
  }, [carregarEvolucao]);

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

  // Após importar um novo CSV: recarrega a lista de entidades (scores podem ter mudado), o
  // histórico de evolução da entidade selecionada e roda a simulação de novo (o modelo de
  // regressão foi retreinado no backend com os dados recém-importados).
  const aoImportarCsv = useCallback(async () => {
    await carregar();
    await carregarEvolucao();
    await simular();
  }, [carregar, carregarEvolucao, simular]);

  const chaveEntidadeAtual = `${esfera}:${entidade?.entityName ?? nome}`;
  const evidenciasAtuais = evidenciasPorEntidade[chaveEntidadeAtual] ?? [];

  const alternarEvidencias = useCallback(
    async (chaveEixo: string) => {
      setEixosComEvidenciaAberta((prev) => {
        const next = new Set(prev);
        if (next.has(chaveEixo)) next.delete(chaveEixo);
        else next.add(chaveEixo);
        return next;
      });

      if (evidenciasPorEntidade[chaveEntidadeAtual]) return; // já em cache para esta entidade

      setCarregandoEvidencias(true);
      try {
        const itens = await listarEvidencias(esfera, entidade?.entityName ?? nome);
        setEvidenciasPorEntidade((prev) => ({ ...prev, [chaveEntidadeAtual]: itens }));
      } finally {
        setCarregandoEvidencias(false);
      }
    },
    [chaveEntidadeAtual, entidade, esfera, nome, evidenciasPorEntidade],
  );

  const variacao = sim?.resumo.variacaoPercentual ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Engine preditiva
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl">Simulador de cenários</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {sim
              ? `${sim.metadados.entidadeSelecionada} · ${normalizarTipoEntidade(sim.metadados.tipoEntidade)}`
              : "Selecione uma entidade para começar."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              source === "api" ? "bg-primary/10 text-primary" : "bg-earth/15 text-earth"
            }`}
          >
            {source === "api" ? "API conectada" : "Demonstração"}
          </span>
          {sim && (
            <Button variant="secondary" onClick={() => exportarRelatorioPdf(sim, ajustes)}>
              <FileDown className="size-4" /> PDF
            </Button>
          )}
        </div>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)} className="mt-8">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="cenario">Cenário</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="projecoes">Projeções</TabsTrigger>
          <TabsTrigger value="tradeoffs">Trade-offs</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="conexao">Conexão</TabsTrigger>
        </TabsList>

        {/* Cenário */}
        <TabsContent value="cenario" className="mt-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="card-soft border-border/70">
              <CardHeader>
                <CardTitle className="text-xl">Cenário de mandato</CardTitle>
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
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
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
                      setAjustes({
                        ajusteFinanciamento: 0,
                        ajusteGovernanca: 0,
                        ajustePoliticas: 0,
                      })
                    }
                  >
                    Zerar ajustes
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold">
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

                {sim && (
                  <div className="space-y-2 border-t border-primary-foreground/20 pt-4">
                    {sim.kpisEixos.map((kpi) => (
                      <div
                        key={kpi.chaveEixo}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="opacity-85">{rotuloPilar(kpi)}</span>
                        <span className="font-display text-lg tabular-nums">
                          {kpi.scoreProjetado.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* Indicadores */}
        <TabsContent value="indicadores" className="mt-6 space-y-10">
          {sim ? (
            <>
              <section className="grid gap-6 md:grid-cols-3">
                {sim.kpisEixos.map((kpi) => {
                  const delta = kpi.scoreProjetado - kpi.scoreAtual;
                  const aberto = eixosComEvidenciaAberta.has(kpi.chaveEixo);
                  const itensDoEixo = evidenciasAtuais.filter((ev) =>
                    evidenciaPertenceAoKpi(ev.eixo, kpi),
                  );
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

                        <button
                          type="button"
                          onClick={() => void alternarEvidencias(kpi.chaveEixo)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                          {aberto ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                          {aberto ? "Ocultar evidências" : "Ver evidências"}
                        </button>

                        {aberto && (
                          <div className="border-t border-border/60 pt-3">
                            <EvidenciaPainel
                              itens={itensDoEixo}
                              carregando={carregandoEvidencias}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
              <KpiStrip sim={sim} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Rode uma simulação para ver os KPIs.</p>
          )}
        </TabsContent>

        {/* Projeções */}
        <TabsContent value="projecoes" className="mt-6 space-y-6">
          {sim ? (
            <>
              <Card className="card-soft border-border/70">
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

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="card-soft border-border/70">
                  <CardHeader>
                    <CardTitle className="text-xl">Comparativo por eixo</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Score atual x projetado em Governança, Políticas Públicas e Financiamento.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AxisBarChart kpis={sim.kpisEixos} />
                  </CardContent>
                </Card>

                <Card className="card-soft border-border/70">
                  <CardHeader>
                    <CardTitle className="text-xl">Teia dos três pilares</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Equilíbrio entre os eixos no fim do mandato.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AxisRadarChart kpis={sim.kpisEixos} />
                  </CardContent>
                </Card>
              </div>

              <Card className="card-soft border-border/70">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Mapa de calor {esfera === "Federal" ? "nacional" : `— entidades ${esfera}`}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Comparação dos scores entre as entidades da esfera selecionada.
                  </p>
                </CardHeader>
                <CardContent>
                  <ScoreHeatmap entidades={entidadesDaEsfera} destaque={nome} />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Rode uma simulação para ver a série.</p>
          )}
        </TabsContent>

        {/* Trade-offs */}
        <TabsContent value="tradeoffs" className="mt-6">
          <h2 className="text-2xl">Trade-offs identificados</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Toda escolha climática desloca recursos de outro eixo. O modelo destaca os efeitos
            cruzados mais relevantes deste cenário.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {sim?.listaTradeOffs.map((t, i) => {
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
                    <div className="min-w-0">
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
        </TabsContent>

        {/* Evolução */}
        <TabsContent value="evolucao" className="mt-6 space-y-6">
          <CsvUploadCard onImportado={() => void aoImportarCsv()} />

          <Card className="card-soft border-border/70">
            <CardHeader>
              <CardTitle className="text-xl">Evolução histórica</CardTitle>
              <p className="text-sm text-muted-foreground">
                {entidade
                  ? `Score de ${entidade.entityName} em cada avaliação já importada.`
                  : "Selecione uma entidade na aba Cenário para ver o histórico."}
              </p>
            </CardHeader>
            <CardContent>
              {evolucao && evolucao.labels.length > 0 ? (
                <EvolutionChart chart={evolucao} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {entidade
                    ? "Nenhum histórico encontrado para esta entidade ainda."
                    : "Nenhuma entidade selecionada."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conexão */}
        <TabsContent value="conexao" className="mt-6">
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
                  Enquanto a API não responder, o painel usa um motor de simulação local equivalente
                  para demonstração.
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
        </TabsContent>
      </Tabs>
    </main>
  );
}
