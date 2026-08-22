import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";

import { BalaoAgente } from "@/components/agente/balao";
import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { LegendaMapa, MapaBrasil } from "@/components/painel/mapa-brasil";
import { LegendaCriterios, ListaAcao } from "@/components/painel/lista-acao";
import { Button } from "@/components/ui/button";
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
  filtrarTerritorio,
  lacunasPorComponente,
  populacaoSobLacuna,
  REGIOES,
  resumirTerritorio,
  type Regiao,
  type TipoEnte,
} from "@/lib/territorio";
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

  const temFiltro = Boolean(
    busca.tipo || busca.regiao || busca.eixo || busca.comp || busca.ente,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-6">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Onde começar
        </h1>
        <p className="mt-3 max-w-prose text-pretty text-muted-foreground">
          “Quem está pior” e “por onde começar” são perguntas diferentes. Esta tela responde a
          segunda: {META.total} entes avaliados, cruzados por território, eixo e componente, e
          ordenados por um índice que se decompõe critério a critério.
        </p>
      </header>

      {/* ---------------- faixa 1: controles ---------------- */}
      <section
        aria-label="Filtros"
        className="mb-6 rounded-xl border bg-card p-3 shadow-sm sm:p-4"
      >
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Tipo de ente">
            <Seletor
              valor={tipo}
              opcoes={TIPOS.map((t) => ({ valor: t, texto: t === "todos" ? "Todos" : t }))}
              onMudar={(v) => aplicar({ tipo: v as TipoEnte | "todos", ente: undefined })}
            />
          </Campo>

          <Campo rotulo="Região">
            <Seletor
              valor={regiao}
              opcoes={[
                { valor: "todas", texto: "Todas" },
                ...REGIOES.map((r) => ({ valor: r, texto: r })),
              ]}
              onMudar={(v) => aplicar({ regiao: v as Regiao | "todas", ente: undefined })}
            />
          </Campo>

          <Campo rotulo="Eixo">
            <Seletor
              valor={eixo ?? ""}
              opcoes={[
                { valor: "", texto: "Todos" },
                ...EIXOS.map((e) => ({ valor: e, texto: e })),
              ]}
              onMudar={(v) => aplicar({ eixo: v || undefined })}
            />
          </Campo>

          <Campo rotulo="Componente">
            <Seletor
              valor={comp ?? ""}
              opcoes={[
                { valor: "", texto: "Todos" },
                ...Object.entries(META.componentes).map(([c, nome]) => ({
                  valor: c,
                  texto: `${c} — ${nome}`,
                })),
              ]}
              onMudar={(v) => aplicar({ comp: v || undefined })}
            />
          </Campo>

          <Campo rotulo="Priorizar para">
            <Seletor
              valor={perfil}
              opcoes={PERFIS_IPA.map((p) => ({ valor: p, texto: PESOS[p].nome }))}
              onMudar={(v) => aplicar({ perfil: v as PerfilPriorizacao })}
            />
          </Campo>

          {temFiltro && (
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => void navegar({ search: { perfil }, resetScroll: false, replace: true })}
            >
              <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
              Limpar
            </Button>
          )}
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {PESOS[perfil].pergunta}
        </p>
      </section>

      {/* ---------------- faixa 2: mapa + números ---------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-labelledby="mapa" className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="mapa" className="text-base font-bold">
                {resumo.entes} {resumo.entes === 1 ? "ente" : "entes"} no recorte
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Toque num estado ou numa capital para abrir o resumo.
              </p>
            </div>
          </div>

          <MapaBrasil
            entes={entesFiltrados}
            selecionado={ente ?? null}
            onSelecionar={(nome) => aplicar({ ente: nome ?? undefined })}
            mostrarCapitais={tipo !== "Estado"}
          />

          <div className="mt-3 border-t pt-3">
            <LegendaMapa />
          </div>

          {ente && ENTES[ente] && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-accent/40 p-3">
              <p className="text-sm">
                <strong className="font-semibold">{ente}</strong>{" "}
                <span className="text-muted-foreground">
                  · {ENTES[ente].lac} de {ENTES[ente].tot} sem progresso ·{" "}
                  {formatarPercentual(ENTES[ente].mat)} de maturidade
                </span>
              </p>
              <Button asChild size="sm" className="h-11">
                <Link to="/achados" search={{ ente, ...(comp ? { comp } : {}) }}>
                  Abrir dossiê
                  <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section
            aria-label="Números do recorte"
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <dl className="space-y-3">
              <Numero
                rotulo="Requisitos sem progresso"
                valor={`${formatarNumero(resumo.lacunas)}`}
                nota={`de ${formatarNumero(resumo.requisitos)} avaliados`}
                tom="critico"
              />
              <Numero
                rotulo="Maturidade média"
                valor={formatarPercentual(resumo.maturidade)}
                nota={`média nacional ${formatarPercentual(META.nacional.mat)}`}
              />
              <Numero
                rotulo="Entes sem nenhuma lacuna"
                valor={String(resumo.semLacuna)}
                nota={`de ${resumo.entes} no recorte`}
                tom="ok"
              />
              <Numero
                rotulo="População sob jurisdição"
                valor={formatarNumero(resumo.populacao)}
                nota="estados e DF, que particionam o território"
              />
            </dl>
          </section>

          <section
            aria-label="Alerta de defesa civil e adaptação"
            className="rounded-xl border-2 border-[var(--sev-critico)]/40 bg-[var(--sev-critico-bg)] p-4"
          >
            <p className="text-sm font-bold text-[var(--sev-critico)]">Requisitos que protegem vidas</p>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  Sob jurisdição com lacuna em adaptação (P2)
                </dt>
                <dd className="text-lg font-bold tabular-nums">{formatarNumero(popP2)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Sob jurisdição com lacuna em defesa civil (P5)
                </dt>
                <dd className="text-lg font-bold tabular-nums">{formatarNumero(popP5)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Mede lacuna de governança, não risco físico: a formulação é “vive sob jurisdição de
              ente com lacuna no requisito”, nunca “está em risco”.
            </p>
          </section>
        </aside>
      </div>

      {/* ---------------- faixa 3: detalhe ---------------- */}
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

          <ListaAcao prioridades={prioridades} perfilLegivel={descreverPesos(PESOS[perfil].pesos)} />
        </section>

        <section
          aria-labelledby="barras-componentes"
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <h2 id="barras-componentes" className="text-base font-bold">
            Lacunas por componente
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">No recorte atual.</p>

          <ul className="mt-3 space-y-1.5">
            {barras.map((b) => (
              <li key={b.c}>
                <button
                  type="button"
                  onClick={() => aplicar({ comp: comp === b.c ? undefined : b.c })}
                  aria-pressed={comp === b.c}
                  className={cn(
                    "grid w-full grid-cols-[2rem_1fr_2.5rem] items-center gap-2 rounded-md py-1.5 text-left",
                    "min-h-11 hover:bg-accent/50",
                    comp === b.c && "bg-accent",
                  )}
                >
                  <span className="font-mono text-xs font-bold text-muted-foreground">{b.c}</span>
                  <span className="h-4 rounded-r-[4px] bg-muted">
                    <span
                      className="block h-full rounded-r-[4px]"
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

          <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
            Toque num componente para filtrar o mapa e a lista por ele.
          </p>
        </section>
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

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="min-w-0 flex-1 basis-40">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

function Seletor({
  valor,
  opcoes,
  onMudar,
}: {
  valor: string;
  opcoes: { valor: string; texto: string }[];
  onMudar: (valor: string) => void;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onMudar(e.target.value)}
      className="mt-1 h-11 w-full rounded-lg border bg-background px-2.5 text-sm font-medium"
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: "critico" | "ok";
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd
        className={cn(
          "text-2xl font-bold leading-none tabular-nums",
          tom === "critico" && "text-[var(--sev-critico)]",
          tom === "ok" && "text-[var(--sev-ok)]",
        )}
      >
        {valor}
      </dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{nota}</dd>
    </div>
  );
}
