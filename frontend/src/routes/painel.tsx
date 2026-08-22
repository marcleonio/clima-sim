import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { BalaoAgente } from "@/components/agente/balao";
import { degrauDeficit } from "@/components/achado/componente-heatmap";
import {
  BarraDegraus,
  BarrasProporcionais,
  FaixaDistribuicao,
} from "@/components/graficos/formas";
import { BarraFiltros } from "@/components/painel/barra-filtros";
import { LegendaMapa, MapaBrasil } from "@/components/painel/mapa-brasil";
import { PainelEnte } from "@/components/painel/painel-ente";
import { LegendaCriterios, ListaAcao } from "@/components/painel/lista-acao";
import { formatarNumero, formatarPercentual, type MapaReferencias } from "@/lib/achados";
import { insightsDoRecorte } from "@/lib/agente/insights";
import { ENTES, META } from "@/lib/dados";
import {
  descreverPesos,
  listaDeAcao,
  PESOS,
  type PerfilPriorizacao,
} from "@/lib/prioridade";
import {
  distribuicaoDeMaturidade,
  entesSemLacuna,
  filtrarTerritorio,
  lacunasPorComponente,
  populacaoSobLacuna,
  REGIOES,
  resumirTerritorio,
  type Regiao,
  type TipoEnte,
} from "@/lib/territorio";
import { useNumeroAnimado } from "@/hooks/use-numero-animado";
import { cn } from "@/lib/utils";
import referenciasBrutas from "@/data/referencias.json";

const REFERENCIAS = referenciasBrutas as unknown as MapaReferencias;

const TIPOS: (TipoEnte | "todos")[] = ["todos", "Estado", "Município"];
const EIXOS = Object.keys(META.nacional.eixos);
const PERFIS_IPA = Object.keys(PESOS) as PerfilPriorizacao[];

interface BuscaPainel {
  tipo?: TipoEnte | "todos";
  regiao?: Regiao | "todas";
  eixo?: string;
  comp?: string;
  perfil?: PerfilPriorizacao;
  ente?: string;
}

export const Route = createFileRoute("/painel")({
  component: PainelPage,
  validateSearch: (busca: Record<string, unknown>): BuscaPainel => {
    const texto = (chave: string) =>
      typeof busca[chave] === "string" ? (busca[chave] as string) : undefined;

    const tipo = texto("tipo");
    const regiao = texto("regiao");
    const eixo = texto("eixo");
    const comp = texto("comp");
    const perfil = texto("perfil");
    const ente = texto("ente");

    return {
      ...(tipo && TIPOS.includes(tipo as TipoEnte) && tipo !== "todos" ? { tipo: tipo as TipoEnte } : {}),
      ...(regiao && REGIOES.includes(regiao as Regiao) ? { regiao: regiao as Regiao } : {}),
      ...(eixo && EIXOS.includes(eixo) ? { eixo } : {}),
      ...(comp && META.componentes[comp] ? { comp } : {}),
      ...(perfil && PERFIS_IPA.includes(perfil as PerfilPriorizacao)
        ? { perfil: perfil as PerfilPriorizacao }
        : {}),
      ...(ente && ENTES[ente] ? { ente } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Painel nacional — ação climática nos 51 entes avaliados" },
      {
        name: "description",
        content:
          "Mapa e ranking multicritério da ação climática em 26 estados, 24 capitais e o Distrito Federal, a partir dos dados do Painel ClimaBrasil do TCU.",
      },
    ],
  }),
});

function PainelPage() {
  const navegar = Route.useNavigate();
  const busca = Route.useSearch();
  const { tipo = "todos", regiao = "todas", eixo, comp, perfil = "fiscalizacao", ente } = busca;

  /**
   * Todo filtro reescreve a URL — o recorte é compartilhável por link.
   *
   * `undefined` é como se limpa um filtro, então o tipo precisa admiti-lo
   * explicitamente: sob `exactOptionalPropertyTypes`, "ausente" e "presente e
   * indefinido" são coisas diferentes.
   */
  const aplicar = (mudanca: { [K in keyof BuscaPainel]?: BuscaPainel[K] | undefined }) => {
    const proximo: Record<string, unknown> = { ...busca, ...mudanca };
    // "todos"/"todas" são o estado neutro do seletor: somem da URL para o link
    // compartilhado carregar só o que de fato restringe.
    for (const [chave, valor] of Object.entries(proximo)) {
      if (!valor || valor === "todos" || valor === "todas") delete proximo[chave];
    }
    /*
     * resetScroll: false é o que faz o clique parecer que funciona.
     *
     * O roteador trata mudança de parâmetro de busca como navegação para uma
     * página nova e restaura a rolagem para o topo. Medido antes da correção:
     * no painel, scroll 508 -> 0; no dossiê, 997 -> 0. O usuário clicava no que
     * estava na frente dele, a página saltava, e o resultado — que nasce abaixo
     * — ficava mais longe ainda. Do lado de quem olha, isso é indistinguível de
     * "não fez nada".
     *
     * replace: true entra junto porque a URL aqui é ESTADO DE FILTRO, não
     * navegação. Sem ele, cada toque num filtro empilha uma entrada no
     * histórico e o botão "voltar" vira uma máquina de desfazer filtro a
     * filtro, em vez de levar de volta à tela anterior.
     */
    void navegar({ search: proximo as BuscaPainel, resetScroll: false, replace: true });
  };

  const selecionados = useMemo(
    () => filtrarTerritorio(ENTES, { tipo, regiao, componente: comp ?? null, eixo: eixo ?? null }),
    [tipo, regiao, comp, eixo],
  );

  const entesFiltrados = useMemo(
    () => Object.fromEntries(selecionados),
    [selecionados],
  );

  const resumo = useMemo(() => resumirTerritorio(selecionados), [selecionados]);

  const prioridades = useMemo(
    () =>
      listaDeAcao(
        selecionados.map(([nome, e]) => ({
          nome,
          tipo: e.tipo,
          pop: e.pop,
          comps: e.comps,
        })),
        META.componentes,
        REFERENCIAS,
        perfil,
        12,
      ),
    [selecionados, perfil],
  );

  const barras = useMemo(() => lacunasPorComponente(selecionados), [selecionados]);
  const maiorBarra = barras[0]?.lacunas ?? 1;

  const popP5 = useMemo(() => populacaoSobLacuna(ENTES, "P5"), []);
  const popP2 = useMemo(() => populacaoSobLacuna(ENTES, "P2"), []);

  const insights = useMemo(() => insightsDoRecorte(selecionados), [selecionados]);
  const distribuicao = useMemo(() => distribuicaoDeMaturidade(selecionados), [selecionados]);
  const semPendencia = useMemo(() => entesSemLacuna(selecionados), [selecionados]);

  /**
   * O ente sob o cursor, em qualquer componente da tela.
   *
   * É o que faz mapa, ranking e barras parecerem um instrumento único em vez de
   * três widgets: passar o mouse num item do ranking acende o mesmo ente no
   * mapa, e vice-versa.
   */
  const [realcado, setRealcado] = useState<string | null>(null);

  const temFiltro = Boolean(
    busca.tipo || busca.regiao || busca.eixo || busca.comp || busca.ente,
  );

  /** Filtros aplicados, para a barra mostrar e permitir remover um a um. */
  const ativos = [
    ...(busca.tipo ? [{ texto: busca.tipo, onRemover: () => aplicar({ tipo: undefined }) }] : []),
    ...(busca.regiao ? [{ texto: busca.regiao, onRemover: () => aplicar({ regiao: undefined }) }] : []),
    ...(busca.eixo ? [{ texto: busca.eixo, onRemover: () => aplicar({ eixo: undefined }) }] : []),
    ...(busca.comp
      ? [
          {
            texto: `${busca.comp} — ${META.componentes[busca.comp] ?? busca.comp}`,
            onRemover: () => aplicar({ comp: undefined }),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
      <header className="py-5">
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Onde começar
        </h1>
        <p className="mt-1.5 max-w-prose text-pretty text-sm text-muted-foreground">
          “Quem está pior” e “por onde começar” são perguntas diferentes. Esta tela responde a
          segunda: {META.total} entes cruzados por território, eixo e componente, ordenados por um
          índice que se decompõe critério a critério.
        </p>
      </header>

      {/* ---------------- faixa 1: controles, uma linha ---------------- */}
      <BarraFiltros
        grupos={[
          {
            rotulo: "Tipo",
            valor: tipo,
            opcoes: [
              { valor: "todos", texto: "Todos" },
              { valor: "Estado", texto: "Estados", curto: "UF" },
              { valor: "Município", texto: "Capitais", curto: "Cap." },
            ],
            onMudar: (v) => aplicar({ tipo: v as TipoEnte | "todos", ente: undefined }),
          },
          {
            rotulo: "Priorizar",
            valor: perfil,
            opcoes: PERFIS_IPA.map((x) => ({ valor: x, texto: PESOS[x].nome })),
            onMudar: (v) => aplicar({ perfil: v as PerfilPriorizacao }),
          },
        ]}
        caixas={[
          {
            rotulo: "Região",
            valor: regiao,
            opcoes: [
              { valor: "todas", texto: "Todas as regiões" },
              ...REGIOES.map((r) => ({ valor: r, texto: r })),
            ],
            onMudar: (v) => aplicar({ regiao: v as Regiao | "todas", ente: undefined }),
          },
          {
            rotulo: "Eixo",
            valor: eixo ?? "",
            opcoes: [{ valor: "", texto: "Todos os eixos" }, ...EIXOS.map((e) => ({ valor: e, texto: e }))],
            onMudar: (v) => aplicar({ eixo: v || undefined }),
          },
          {
            rotulo: "Componente",
            valor: comp ?? "",
            opcoes: [
              { valor: "", texto: "Todos os componentes" },
              ...Object.entries(META.componentes).map(([c, nome]) => ({
                valor: c,
                texto: `${c} — ${nome}`,
              })),
            ],
            onMudar: (v) => aplicar({ comp: v || undefined }),
          },
        ]}
        ativos={ativos}
        onLimpar={() =>
          void navegar({ search: { perfil }, resetScroll: false, replace: true })
        }
        nota={PESOS[perfil].pergunta}
      />

      {/* ---------------- faixa 2: mapa + resultado, uma dobra ---------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="mapa"
          className="flex min-h-[26rem] flex-col rounded-xl border bg-card p-4 shadow-sm lg:h-[calc(100vh-16rem)]"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="mapa" className="text-base font-bold">
              {resumo.entes} {resumo.entes === 1 ? "ente" : "entes"} no recorte
            </h2>
            {/* a legenda sobe para o cabeçalho — antes ficava a 1.266px do topo */}
            <LegendaMapa />
          </div>

          <MapaBrasil
            entes={entesFiltrados}
            selecionado={ente ?? null}
            onSelecionar={(nome) => aplicar({ ente: nome ?? undefined })}
            mostrarCapitais={tipo !== "Estado"}
            realcado={realcado}
            onRealcar={setRealcado}
          />
        </section>

        <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-16rem)] lg:grid-rows-[minmax(0,1fr)_auto]">
          {/* o resultado do clique nasce AQUI, ao lado do mapa */}
          <PainelEnte
            nome={ente ?? null}
            ente={ente ? ENTES[ente] : undefined}
            componente={comp ?? null}
            nomesComponentes={META.componentes}
            mediaNacional={META.nacional.mat}
          />

          {/*
            Cada número tem um trabalho diferente, e o trabalho escolhe a forma.
            Quatro cartões idênticos com quatro números grandes era o que não
            fazer: uma parte-no-todo não se lê como uma posição na distribuição.
          */}
          <section
            aria-label="Números do recorte"
            className="space-y-3.5 overflow-y-auto rounded-xl border bg-card p-4 shadow-sm"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Itens por classificação
                </h3>
                <p className="text-sm">
                  <strong className="tabular-nums text-[var(--sev-critico)]">
                    <Numero bruto={resumo.lacunas} formatar={(v) => formatarNumero(Math.round(v))} />
                  </strong>{" "}
                  <span className="text-muted-foreground">
                    sem progresso, de {formatarNumero(resumo.requisitos)}
                  </span>
                </p>
              </div>
              <div className="mt-1.5">
                <BarraDegraus degraus={resumo.degraus} />
              </div>
            </div>

            <div className="border-t pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pontuação dos entes
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cada traço é um ente. Tracejado: média nacional.
              </p>
              <div className="mt-1.5">
                <FaixaDistribuicao
                  pontos={distribuicao}
                  media={resumo.maturidade}
                  referencia={META.nacional.mat}
                  realcado={realcado}
                  onRealcar={setRealcado}
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                População sob jurisdição
              </h3>
              <div className="mt-1.5">
                <BarrasProporcionais
                  total={resumo.populacao}
                  series={[
                    {
                      rotulo: "com item sem progresso em adaptação (P2)",
                      valor: popP2,
                      tom: "critico",
                    },
                    {
                      rotulo: "com item sem progresso em defesa civil (P5)",
                      valor: popP5,
                      tom: "critico",
                    },
                  ]}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Mede lacuna de governança, não risco físico: “vive sob jurisdição de ente com item
                sem progresso”, nunca “está em risco”.
              </p>
            </div>

            {semPendencia.length > 0 && (
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sem nenhum item pendente
                </h3>
                {/* três nomes valem mais que o número três: são os precedentes */}
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {semPendencia.map((nome) => (
                    <li key={nome}>
                      <Link
                        to="/achados"
                        search={{ ente: nome }}
                        className="inline-flex min-h-9 items-center rounded-full border border-[var(--sev-ok)]/40 bg-[var(--sev-ok-bg)] px-3 text-xs font-semibold text-[var(--sev-ok)]"
                      >
                        {nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ---------------- faixa 3: exploração, abaixo da dobra ---------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-labelledby="lista-acao">
          <div className="mb-3">
            <h2 id="lista-acao" className="text-base font-bold">
              Por onde começar — perfil {PESOS[perfil].nome.toLowerCase()}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cada barra é a decomposição do índice: nenhum número sai de caixa-preta.
            </p>
            <div className="mt-2">
              <LegendaCriterios />
            </div>
          </div>

          <ListaAcao
            prioridades={prioridades}
            perfilLegivel={descreverPesos(PESOS[perfil].pesos)}
            realcado={realcado}
            onRealcar={setRealcado}
          />
        </section>

        <div className="space-y-4">


          <section
            aria-labelledby="barras-componentes"
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <h2 id="barras-componentes" className="text-base font-bold">
              Itens sem progresso por componente
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Toque para filtrar o painel.</p>

            <ul className="mt-3 space-y-1">
              {barras.map((b) => (
                <li key={b.c}>
                  <button
                    type="button"
                    onClick={() => aplicar({ comp: comp === b.c ? undefined : b.c })}
                    aria-pressed={comp === b.c}
                    className={cn(
                      "grid w-full grid-cols-[2rem_1fr_2.5rem] items-center gap-2 rounded-md py-1 text-left",
                      "min-h-11 hover:bg-accent/50",
                      comp === b.c && "bg-accent",
                    )}
                  >
                    <span className="font-mono text-xs font-bold text-muted-foreground">{b.c}</span>
                    <span className="h-3.5 rounded-r-[4px] bg-muted">
                      <span
                        className="block h-full rounded-r-[4px] transition-[width] duration-300"
                        style={{
                          width: `${maiorBarra ? (b.lacunas / maiorBarra) * 100 : 0}%`,
                          background: `var(--calor-${degrauDeficit(
                            b.total ? 100 - (100 * b.lacunas) / b.total : 100,
                          )})`,
                        }}
                      />
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums">{b.lacunas}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <p className="mt-8 border-t pt-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {META.total} entes · {META.versao} · extração {META.snapshot} · Painel ClimaBrasil / TCU
      </p>

      <BalaoAgente
        contexto={`O usuário está no painel nacional, recorte: tipo ${tipo}, região ${regiao}, eixo ${eixo ?? "todos"}, componente ${comp ?? "todos"}, perfil de priorização ${perfil}.`}
        insights={insights}
      />
    </div>
  );
}

// ------------------------------------------------------------------ peças

/**
 * Um número do recorte, que interpola quando o filtro muda.
 *
 * Anima-se o que MUDOU DE VALOR: ver 640 correr até 213 comunica a magnitude da
 * mudança durante a própria transição, sem o leitor precisar ter memorizado o
 * valor anterior.
 */
/**
 * Um número que interpola quando o filtro muda.
 *
 * Anima-se o que MUDOU DE VALOR: ver 640 correr até 245 comunica a magnitude da
 * mudança durante a própria transição, sem o leitor precisar ter memorizado o
 * valor anterior.
 */
function Numero({
  bruto,
  formatar,
  casas = 0,
}: {
  bruto: number;
  formatar: (valor: number) => string;
  casas?: number;
}) {
  return <>{formatar(useNumeroAnimado(bruto, casas))}</>;
}
