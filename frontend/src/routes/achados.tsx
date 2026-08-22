import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileText, Search, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AchadoList } from "@/components/achado/achado-list";
import { ColisaoBanner } from "@/components/achado/colisao-banner";
import { ComponenteHeatmap } from "@/components/achado/componente-heatmap";
import { DocumentoDialog } from "@/components/achado/documento-dialog";
import { EntitySummary } from "@/components/achado/entity-summary";
import { cn } from "@/lib/utils";
import {
  codigoAchado,
  filtrarEntes,
  formatarPercentual,
  severidade,
  taxaLacuna,
  type BaseDados,
  type MapaReferencias,
} from "@/lib/achados";
import { gerarDocumento, TIPOS_DOCUMENTO, type DocumentoGerado, type TipoDocumento } from "@/lib/documentos";
import baseBruta from "@/data/entes.json";
import referenciasBrutas from "@/data/referencias.json";

const BASE = baseBruta as unknown as BaseDados;
const REFERENCIAS = referenciasBrutas as unknown as MapaReferencias;
const NOMES = Object.keys(BASE.entes).sort((a, b) => a.localeCompare(b, "pt-BR"));
const DESTAQUES = ["Boa Vista", "Macapá", "Rio Grande do Sul", "São Paulo"].filter((n) => BASE.entes[n]);

interface BuscaAchados {
  /** Ente aberto. Fica na URL para que o dossiê possa ser compartilhado por link. */
  ente?: string;
}

export const Route = createFileRoute("/achados")({
  component: AchadosPage,
  validateSearch: (busca: Record<string, unknown>): BuscaAchados => {
    const bruto = busca["ente"];
    const ente = typeof bruto === "string" ? bruto : undefined;
    return ente && BASE.entes[ente] ? { ente } : {};
  },
  head: () => ({
    meta: [
      { title: "Achado Climático — do dado público à peça de cobrança" },
      {
        name: "description",
        content:
          "Consulte as lacunas de ação climática do seu estado ou capital e gere ofícios, requerimentos e planos de providências prontos para protocolar.",
      },
    ],
  }),
});

function AchadosPage() {
  const navegar = Route.useNavigate();
  const { ente: enteAtivo } = Route.useSearch();

  const [consulta, setConsulta] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [documento, setDocumento] = useState<DocumentoGerado | null>(null);
  const campoBusca = useRef<HTMLInputElement>(null);

  const sugestoes = useMemo(() => filtrarEntes(NOMES, consulta).slice(0, 8), [consulta]);
  const ente = enteAtivo ? (BASE.entes[enteAtivo] ?? null) : null;

  const abrirEnte = useCallback(
    (nome: string) => {
      setSelecionados(new Set());
      setConsulta("");
      campoBusca.current?.blur();
      void navegar({ search: { ente: nome } });
    },
    [navegar],
  );

  const alternar = useCallback((codigo: string) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(codigo)) proximo.delete(codigo);
      else proximo.add(codigo);
      return proximo;
    });
  }, []);

  const selecionarVarios = useCallback((codigos: string[]) => {
    setSelecionados(new Set(codigos));
  }, []);

  const emitir = useCallback(
    (tipo: TipoDocumento) => {
      if (!ente || !enteAtivo) return;
      const escolhidos = ente.achados.filter((a) => selecionados.has(codigoAchado(a)));
      setDocumento(
        gerarDocumento(tipo, {
          nomeEnte: enteAtivo,
          ente,
          achados: escolhidos,
          snapshot: BASE.meta.snapshot,
          versao: BASE.meta.versao,
          emitidoEm: new Date(),
        }),
      );
    },
    [ente, enteAtivo, selecionados],
  );

  const qtdSelecionada = selecionados.size;
  const rotuloSelecao =
    qtdSelecionada === 0
      ? `todos os ${ente?.achados.length ?? 0} achados`
      : qtdSelecionada === 1
        ? "1 achado"
        : `${qtdSelecionada} achados`;

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
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
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
              const alvo = BASE.entes[nome];
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
                    className="flex w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left last:border-b-0 hover:bg-accent/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{nome}</span>
                      <span className="block text-xs text-muted-foreground">{alvo.tipo}</span>
                    </span>
                    <span
                      className={cn(
                        "flex-none rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                        sev === "critico" && "bg-destructive/12 text-destructive",
                        sev === "atencao" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                        sev === "maduro" && "bg-primary/12 text-primary",
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

      {/* ---------------- estado inicial ---------------- */}
      {!ente && (
        <section className="mx-auto flex min-h-[42vh] max-w-2xl flex-col justify-center text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Consulte a ação climática do seu estado ou capital
          </h1>
          <p className="mx-auto mt-4 max-w-prose text-pretty text-muted-foreground">
            Cada lacuna vem com o parecer técnico que a auditoria registrou e a norma que a sustenta —
            pronta para virar ofício, requerimento ou plano de providências.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {DESTAQUES.map((nome) => (
              <Button key={nome} variant="outline" className="rounded-full" onClick={() => abrirEnte(nome)}>
                {nome}
                <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
              </Button>
            ))}
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {BASE.meta.total} entes · {BASE.meta.versao} · extração {BASE.meta.snapshot}
          </p>
        </section>
      )}

      {/* ---------------- dashboard ---------------- */}
      {ente && enteAtivo && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <EntitySummary
              nome={enteAtivo}
              ente={ente}
              snapshot={BASE.meta.snapshot}
              nacional={BASE.meta.nacional.eixos}
              mediaNacionalGeral={BASE.meta.nacional.mat}
            />

            <ColisaoBanner ente={ente} />

            <ComponenteHeatmap
              ente={ente}
              nomes={BASE.meta.componentes}
              nacional={BASE.meta.nacional.comps}
            />

            <AchadoList
              achados={ente.achados}
              selecionados={selecionados}
              referencias={REFERENCIAS}
              nomeEnte={enteAtivo}
              onAlternar={alternar}
              onSelecionarVarios={selecionarVarios}
            />
          </div>

          {/* painel de encaminhamento — sticky no desktop */}
          <aside className="lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="rounded-xl border-2 border-primary/60 bg-card p-4">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Send className="size-4 text-primary" aria-hidden />
                Encaminhar
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                A peça sai preenchida com <strong className="font-semibold text-foreground">{rotuloSelecao}</strong>,
                a base normativa e a fonte de cada informação.
              </p>

              {ente.achados.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Sem achados para encaminhar.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <li key={tipo.id}>
                      <button
                        type="button"
                        onClick={() => emitir(tipo.id)}
                        className="group w-full rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-accent/50"
                      >
                        <span className="block font-mono text-xs uppercase tracking-wider text-primary">
                          {tipo.fluxo}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                          <FileText className="size-3.5 flex-none text-muted-foreground" aria-hidden />
                          {tipo.nome}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                          {tipo.descricao}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      <DocumentoDialog documento={documento} aberto={!!documento} onFechar={() => setDocumento(null)} />
    </div>
  );
}
