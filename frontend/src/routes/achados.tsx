import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileText, Search, SearchX, ShieldAlert, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BalaoAgente } from "@/components/agente/balao";
import { PlanoAcao } from "@/components/achado/plano-acao";
import { PrecedentesDoEnte } from "@/components/painel/grafo-semelhanca";
import { AchadoList } from "@/components/achado/achado-list";
import { ComponenteHeatmap } from "@/components/achado/componente-heatmap";
import { DocumentoDialog } from "@/components/achado/documento-dialog";
import { EntitySummary } from "@/components/achado/entity-summary";
import { TrajetoriaPainel } from "@/components/achado/trajetoria-painel";
import { Veredito } from "@/components/achado/veredito";
import { cn } from "@/lib/utils";
import { descreverTrajetoria, posicaoProjetada, projetar } from "@/lib/trajetoria";
import {
  codigoAchado,
  COMPONENTES_CRITICOS,
  filtrarEntes,
  formatarPercentual,
  severidade,
  taxaLacuna,
  vereditoDe,
  type Ente,
  type MapaReferencias,
} from "@/lib/achados";
import {
  documentosPara,
  gerarDocumento,
  perfilPadrao,
  PERFIS,
  type DocumentoGerado,
  type Perfil,
  type TipoDocumento,
} from "@/lib/documentos";
import { insightsDoEnte } from "@/lib/agente/insights";
import { regiaoDe } from "@/lib/territorio";
import { paragrafoSazonal } from "@/lib/enso";
import { pontesPara } from "@/lib/grafo";
import { planoDeAcao } from "@/lib/plano";
import { carregarDossie, ENTES, META, NOMES_ENTES, taxasDosOutros } from "@/lib/dados";
import referenciasBrutas from "@/data/referencias.json";

const REFERENCIAS = referenciasBrutas as unknown as MapaReferencias;
const DESTAQUES = ["Boa Vista", "Macapá", "Rio Grande do Sul", "São Paulo (estado)"].filter(
  (n) => ENTES[n],
);
const IDS_PERFIS: string[] = PERFIS.map((p) => p.id);

interface BuscaAchados {
  /** Ente aberto. Fica na URL para que o dossiê possa ser compartilhado por link. */
  ente?: string;
  /** Preservado mesmo quando não existe, para poder explicar o que houve. */
  desconhecido?: string;
  perfil?: Perfil;
  /** Componente usado como filtro da lista, vindo do mapa de calor. */
  comp?: string;
}

export const Route = createFileRoute("/achados")({
  component: AchadosPage,
  validateSearch: (busca: Record<string, unknown>): BuscaAchados => {
    const bruto = busca["ente"];
    const nome = typeof bruto === "string" ? bruto : undefined;

    const perfilBruto = busca["perfil"];
    const perfil =
      typeof perfilBruto === "string" && IDS_PERFIS.includes(perfilBruto)
        ? (perfilBruto as Perfil)
        : undefined;

    const compBruto = busca["comp"];
    const comp = typeof compBruto === "string" ? compBruto : undefined;

    if (!nome) return { ...(perfil && { perfil }) };

    // Um ente desconhecido não é descartado em silêncio: quem abriu um link
    // compartilhado com o nome errado precisa saber o que aconteceu.
    return ENTES[nome]
      ? { ente: nome, ...(perfil && { perfil }), ...(comp && { comp }) }
      : { desconhecido: nome, ...(perfil && { perfil }) };
  },
  // O dossiê do ente só desce quando alguém abre aquele ente. O índice, que é
  // o que a busca e o ranking usam, já veio com a página.
  loaderDeps: ({ search }) => ({ ente: search.ente }),
  loader: ({ deps }) => (deps.ente ? carregarDossie(deps.ente) : null),
  head: () => ({
    meta: [
      { title: "Itens de avaliação — do dado público à peça de cobrança" },
      {
        name: "description",
        content:
          "Consulte os itens de avaliação sem progresso do seu estado ou capital e gere ofícios, requerimentos e planos de providências prontos para protocolar.",
      },
    ],
  }),
});

function AchadosPage() {
  const navegar = Route.useNavigate();
  const { ente: enteAtivo, desconhecido, perfil = "controle", comp } = Route.useSearch();
  const dossie = Route.useLoaderData();

  const [consulta, setConsulta] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [anterior, setAnterior] = useState<Set<string> | null>(null);
  const [documento, setDocumento] = useState<DocumentoGerado | null>(null);
  const campoBusca = useRef<HTMLInputElement>(null);

  const sugestoes = useMemo(() => filtrarEntes(NOMES_ENTES, consulta).slice(0, 8), [consulta]);

  // O resumo vem do índice; os achados vêm do dossiê carregado sob demanda.
  const ente = useMemo<Ente | null>(() => {
    const resumo = enteAtivo ? ENTES[enteAtivo] : undefined;
    if (!resumo) return null;
    return { ...resumo, achados: dossie?.achados ?? [] };
  }, [enteAtivo, dossie]);

  const veredito = useMemo(
    () =>
      ente && enteAtivo
        ? vereditoDe(enteAtivo, ente, META.total, META.nacional.mat)
        : null,
    [ente, enteAtivo],
  );

  const criticos = useMemo(
    () =>
      ente
        ? ente.achados.filter((a) => (COMPONENTES_CRITICOS as readonly string[]).includes(a.c))
        : [],
    [ente],
  );

  const proximos = useMemo(
    () => (desconhecido ? filtrarEntes(NOMES_ENTES, desconhecido).slice(0, 4) : []),
    [desconhecido],
  );

  const outrasTaxas = useMemo(() => (enteAtivo ? taxasDosOutros(enteAtivo) : []), [enteAtivo]);

  /**
    * Componentes que este ente falha e alguém do mesmo grupo de semelhança já
    * resolveu. É a resposta para "e agora, como resolvo?" — e ela não é
    * gerada: é o parecer que o auditor escreveu sobre quem resolveu.
    */
  const precedentes = useMemo(() => {
    if (!enteAtivo || !ente) return [];
    return pontesPara(enteAtivo, (c) => (ente.comps[c]?.l ?? 0) > 0);
  }, [enteAtivo, ente]);

  /**
    * O que o gestor faz com a informação: o painel diz onde está pior, o plano
    * diz em que ordem atacar — e por quê.
    */
  const plano = useMemo(() => {
    const resumo = enteAtivo ? ENTES[enteAtivo] : undefined;
    if (!enteAtivo || !resumo || !ente) return null;
    return planoDeAcao(
      enteAtivo,
      resumo,
      META.componentes,
      (c) => ente.achados.find((a) => a.c === c)?.eixo ?? "",
    );
  }, [enteAtivo, ente]);

  const insights = useMemo(() => {
    const resumo = enteAtivo ? ENTES[enteAtivo] : undefined;
    return resumo && enteAtivo ? insightsDoEnte(enteAtivo, resumo) : [];
  }, [enteAtivo]);

  const abrirEnte = useCallback(
    (nome: string) => {
      setSelecionados(new Set());
      setAnterior(null);
      setConsulta("");
      campoBusca.current?.blur();
      // Abrir outro ente é navegação de verdade — aqui o topo É o lugar certo.
      void navegar({ search: { ente: nome, perfil } });
    },
    [navegar, perfil],
  );

  /** Toda troca de seleção guarda a anterior — desfazer em vez de confirmar. */
  const aplicarSelecao = useCallback((proxima: Set<string>) => {
    setSelecionados((atual) => {
      setAnterior(atual);
      return proxima;
    });
  }, []);

  const alternar = useCallback(
    (codigo: string) => {
      const proximo = new Set(selecionados);
      if (proximo.has(codigo)) proximo.delete(codigo);
      else proximo.add(codigo);
      aplicarSelecao(proximo);
    },
    [selecionados, aplicarSelecao],
  );

  const selecionarVarios = useCallback(
    (codigos: string[]) => aplicarSelecao(new Set(codigos)),
    [aplicarSelecao],
  );

  const desfazer = useCallback(() => {
    if (!anterior) return;
    setSelecionados(anterior);
    setAnterior(null);
  }, [anterior]);

  const emitir = useCallback(
    (tipo: TipoDocumento) => {
      if (!ente || !enteAtivo) return;
      const escolhidos = ente.achados.filter((a) => selecionados.has(codigoAchado(a)));

      // A peça leva a mesma projeção que a tela mostra — aritmética da escala
      // oficial sobre os achados que ela própria endereça.
      const movidos = escolhidos.length || ente.achados.length;
      const projecao = projetar(ente, movidos, 1);
      const trajetoria = ente.lac
        ? descreverTrajetoria(
            enteAtivo,
            projecao,
            posicaoProjetada(ente, projecao, outrasTaxas, ente.rank),
          )
        : null;

      setDocumento(
        gerarDocumento(tipo, {
          nomeEnte: enteAtivo,
          ente,
          achados: escolhidos,
          snapshot: META.snapshot,
          versao: META.versao,
          emitidoEm: new Date(),
          totalDeEntes: META.total,
          trajetoria,
          sazonal: paragrafoSazonal(enteAtivo, regiaoDe(ente.id)),
        }),
      );
    },
    [ente, enteAtivo, selecionados, outrasTaxas],
  );

  const qtdSelecionada = selecionados.size;
  const rotuloSelecao =
    qtdSelecionada === 0
      ? `todos os ${ente?.achados.length ?? 0} achados`
      : qtdSelecionada === 1
        ? "1 item"
        : `${qtdSelecionada} achados`;

  const pecas = documentosPara(perfil);
  const pecaPrimaria = pecas[0];
  const definicaoPerfil = perfilPadrao(perfil);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      {/* ---------------- busca ---------------- */}
      <div className="relative mx-auto mb-8 max-w-xl">
        <label htmlFor="busca-ente" className="sr-only">
          Buscar estado ou capital
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="busca-ente"
          ref={campoBusca}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar estado ou capital…"
          autoComplete="off"
          className="h-12 rounded-xl pl-10 text-base"
        />
        {consulta && (
          <button
            type="button"
            onClick={() => setConsulta("")}
            className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        )}

        {sugestoes.length > 0 && (
          <ul
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg"
            role="listbox"
            aria-label="Resultados da busca"
          >
            {sugestoes.map((nome) => {
              const alvo = ENTES[nome];
              if (!alvo) return null;
              const taxa = taxaLacuna(alvo);
              const sev = severidade(taxa);
              return (
                <li key={nome}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => abrirEnte(nome)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 border-b px-4 text-left last:border-b-0 hover:bg-accent/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{nome}</span>
                      <span className="block text-xs text-muted-foreground">{alvo.tipo}</span>
                    </span>
                    <span
                      className={cn(
                        "flex-none rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                        sev === "critico" && "bg-[var(--sev-critico-bg)] text-[var(--sev-critico)]",
                        sev === "atencao" && "bg-[var(--sev-atencao-bg)] text-[var(--sev-atencao)]",
                        sev === "maduro" && "bg-[var(--sev-ok-bg)] text-[var(--sev-ok)]",
                      )}
                    >
                      {formatarPercentual(taxa, 0)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---------------- ente não encontrado ---------------- */}
      {desconhecido && (
        <section className="mx-auto max-w-xl rounded-xl border-2 border-[var(--sev-atencao)]/45 bg-[var(--sev-atencao-bg)] p-6 text-center">
          <SearchX className="mx-auto size-6 text-[var(--sev-atencao)]" aria-hidden />
          <h1 className="mt-3 text-lg font-bold">
            Não encontramos “{desconhecido}” entre os {META.total} entes avaliados
          </h1>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            A {META.versao.toLowerCase()} cobre 26 estados, 24 capitais e o Distrito Federal.
            Talvez você queira um destes:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(proximos.length ? proximos : DESTAQUES).map((nome) => (
              <Button key={nome} variant="outline" size="sm" onClick={() => abrirEnte(nome)}>
                {nome}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- estado inicial ---------------- */}
      {!ente && !desconhecido && (
        <section className="mx-auto flex min-h-[42vh] max-w-2xl flex-col justify-center text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Consulte a ação climática do seu estado ou capital
          </h1>
          <p className="mx-auto mt-4 max-w-prose text-pretty text-muted-foreground">
            Cada lacuna vem com o parecer técnico que a auditoria registrou e a norma que a
            sustenta — pronta para virar ofício, requerimento ou plano de providências.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {DESTAQUES.map((nome) => (
              <Button
                key={nome}
                variant="outline"
                className="rounded-full"
                onClick={() => abrirEnte(nome)}
              >
                {nome}
                <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
              </Button>
            ))}
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {META.total} entes · {META.versao} · extração {META.snapshot}
          </p>
        </section>
      )}

      {/* ---------------- dossiê ---------------- */}
      {ente && enteAtivo && veredito && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <EntitySummary
              nome={enteAtivo}
              ente={ente}
              snapshot={META.snapshot}
              nacional={META.nacional.eixos}
              mediaNacionalGeral={META.nacional.mat}
            />

            <Veredito veredito={veredito} financas={ENTES[enteAtivo]?.fin} />

            {plano && plano.passos.length > 0 && <PlanoAcao plano={plano} />}

            {enteAtivo && precedentes.length > 0 && (
              <PrecedentesDoEnte nome={enteAtivo} pontes={precedentes} />
            )}

            <TrajetoriaPainel
              nomeEnte={enteAtivo}
              ente={ente}
              rank={ente.rank}
              selecionados={selecionados.size}
              taxasDosOutros={outrasTaxas}
            />

            <ComponenteHeatmap
              ente={ente}
              nomes={META.componentes}
              nacional={META.nacional.comps}
              filtro={comp ?? null}
              onFiltrar={(componente) =>
                void navegar({
                  search: {
                    ente: enteAtivo,
                    perfil,
                    ...(componente ? { comp: componente } : {}),
                  },
                  // ver a nota em routes/painel.tsx: filtro não é navegação
                  resetScroll: false,
                  replace: true,
                })
              }
            />

            <AchadoList
              achados={ente.achados}
              selecionados={selecionados}
              referencias={REFERENCIAS}
              nomeEnte={enteAtivo}
              componente={comp ?? null}
              nomesComponentes={META.componentes}
              onLimparComponente={() =>
                void navegar({
                  search: { ente: enteAtivo, perfil },
                  resetScroll: false,
                  replace: true,
                })
              }
              onAlternar={alternar}
              onSelecionarVarios={selecionarVarios}
            />
          </div>

          {/* painel de encaminhamento — sticky no desktop */}
          <aside className="lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="space-y-4 rounded-xl border-2 border-primary/60 bg-card p-4 shadow-sm">
              {/* quem está olhando define qual peça é a principal */}
              <div>
                <label
                  htmlFor="perfil"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Sou
                </label>
                <select
                  id="perfil"
                  value={perfil}
                  onChange={(e) =>
                    void navegar({
                      search: {
                        ente: enteAtivo,
                        perfil: e.target.value as Perfil,
                        ...(comp ? { comp } : {}),
                      },
                      resetScroll: false,
                      replace: true,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm font-semibold"
                >
                  {PERFIS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">{definicaoPerfil.descricao}</p>
              </div>

              {/* seleção assistida: ninguém deveria ter que ler 43 pareceres para
                  saber o que entra na peça */}
              {ente.achados.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    A peça sai com
                  </p>
                  <p className="mt-1 text-sm font-semibold">{rotuloSelecao}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {criticos.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 text-xs"
                        onClick={() => selecionarVarios(criticos.map(codigoAchado))}
                      >
                        <ShieldAlert className="mr-1 size-3.5" aria-hidden />
                        Risco de vida ({criticos.length})
                      </Button>
                    )}
                    {qtdSelecionada > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 text-xs"
                        onClick={() => selecionarVarios([])}
                      >
                        Limpar
                      </Button>
                    )}
                    {anterior && (
                      <Button size="sm" variant="ghost" className="h-11 text-xs" onClick={desfazer}>
                        <Undo2 className="mr-1 size-3.5" aria-hidden />
                        Desfazer
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {ente.achados.length === 0 || !pecaPrimaria ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  Sem achados para encaminhar.
                </p>
              ) : (
                <div className="border-t pt-3">
                  {/* ação primária: a peça do perfil escolhido */}
                  <Button
                    size="lg"
                    className="h-auto w-full flex-col items-start gap-0.5 py-3 text-left"
                    onClick={() => emitir(pecaPrimaria.id)}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <FileText className="size-4 flex-none" aria-hidden />
                      {pecaPrimaria.nome}
                    </span>
                    <span className="text-xs font-normal opacity-90">{pecaPrimaria.fluxo}</span>
                  </Button>

                  <details className="mt-2">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-semibold text-muted-foreground hover:text-foreground">
                      Outras peças ({pecas.length - 1})
                    </summary>
                    <ul className="mt-1 space-y-1.5">
                      {pecas.slice(1).map((tipo) => (
                        <li key={tipo.id}>
                          <button
                            type="button"
                            onClick={() => emitir(tipo.id)}
                            className="w-full rounded-lg border p-2.5 text-left transition-colors hover:border-primary hover:bg-accent/50"
                          >
                            <span className="block font-mono text-xs uppercase tracking-wider text-primary">
                              {tipo.fluxo}
                            </span>
                            <span className="mt-0.5 block text-sm font-semibold">{tipo.nome}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <DocumentoDialog
        documento={documento}
        nomeEnte={enteAtivo ?? ""}
        aberto={!!documento}
        onFechar={() => setDocumento(null)}
      />

      <BalaoAgente
        contexto={
          enteAtivo
            ? `O usuário está no dossiê de ${enteAtivo}, com perfil ${perfil}${comp ? `, filtrando pelo componente ${comp}` : ""}.`
            : "O usuário está na tela de busca de entes."
        }
        insights={insights}
      />
    </div>
  );
}
