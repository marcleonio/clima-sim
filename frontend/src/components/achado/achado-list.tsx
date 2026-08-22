import { useMemo, useState } from "react";
import { ChevronDown, Lightbulb, Scale, ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  agruparPorComponente,
  codigoAchado,
  COMPONENTES_CRITICOS,
  referenciaPara,
  type Achado,
  type GrupoComponente,
  type MapaReferencias,
  type Referencia,
} from "@/lib/achados";

const TODOS = "Todos";

function ehCritico(c: string) {
  return (COMPONENTES_CRITICOS as readonly string[]).includes(c);
}

/** Um requisito dentro do grupo: parecer contido, referência sob demanda. */
function ItemAchado({
  achado,
  selecionado,
  referencias,
  onAlternar,
}: {
  achado: Achado;
  selecionado: boolean;
  referencias: Referencia[];
  onAlternar: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const codigo = codigoAchado(achado);

  return (
    <li className={cn("rounded-lg border p-3 transition-colors", selecionado && "border-primary bg-primary/4")}>
      <div className="flex items-start gap-2">
        <span className="-m-1.5 grid size-11 flex-none place-items-center">
          <Checkbox
            checked={selecionado}
            onCheckedChange={onAlternar}
            aria-label={`Selecionar requisito ${codigo}`}
            className="relative size-[17px] rounded-[4px] before:absolute before:-inset-[13px] before:content-['']"
          />
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-mono text-xs font-bold text-muted-foreground">Item {achado.i}</span>
          {/*
            O parecer do auditor é o ativo mais valioso da base — 2.245 deles,
            média de 798 caracteres, escritos por tribunal de contas. Estava
            tipografado como nota de rodapé (14px truncado em 2 linhas). Corpo
            base e entrelinha de leitura: é o texto que a pessoa veio ler.
          */}
          <p
            className={cn(
              "mt-1 text-base leading-relaxed text-foreground/85",
              !expandido && "line-clamp-3",
            )}
          >
            {achado.txt}
          </p>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="mt-1.5 min-h-11 text-sm font-semibold text-primary hover:underline"
          >
            {expandido ? "Recolher" : "Ler o parecer completo"}
          </button>

          {expandido && referencias.length > 0 && (
            <div className="mt-2.5 rounded-lg border border-primary/40 bg-primary/6 p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Lightbulb className="size-3" aria-hidden />
                Quem já resolveu — e o que fez
              </p>
              {referencias.map((r) => (
                <div key={r.ente} className="mt-1.5">
                  <p className="text-xs font-semibold">
                    {r.ente} <span className="font-normal text-muted-foreground">({r.tipo})</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{r.txt}</p>
                </div>
              ))}
              <p className="mt-1.5 text-xs text-muted-foreground">
                Prática registrada pela auditoria em ente com “Estágio avançado” no mesmo requisito.
                Referência a adaptar, não modelo a copiar.
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function GrupoCard({
  grupo,
  selecionados,
  referencias,
  nomeEnte,
  aberto,
  onAbrir,
  onAlternar,
  onAlternarGrupo,
}: {
  grupo: GrupoComponente;
  selecionados: Set<string>;
  referencias: MapaReferencias;
  nomeEnte: string | undefined;
  aberto: boolean;
  onAbrir: () => void;
  onAlternar: (codigo: string) => void;
  onAlternarGrupo: (codigos: string[], marcar: boolean) => void;
}) {
  const critico = ehCritico(grupo.c);
  const codigos = grupo.itens.map(codigoAchado);
  const marcados = codigos.filter((c) => selecionados.has(c)).length;
  const idPainel = `grupo-${grupo.c}`;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        marcados > 0 ? "border-primary ring-1 ring-primary/25" : critico && "border-destructive/40",
      )}
    >
      <div className="flex items-center gap-1 p-3">
        <span className="-m-2 grid size-11 flex-none place-items-center">
          <Checkbox
            checked={marcados === codigos.length && codigos.length > 0}
            onCheckedChange={(v) => onAlternarGrupo(codigos, v === true)}
            aria-label={`Selecionar os ${codigos.length} requisitos de ${grupo.nome}`}
            className="relative size-[18px] rounded-[4px] before:absolute before:-inset-[13px] before:content-['']"
          />
        </span>

        <button
          type="button"
          onClick={onAbrir}
          aria-expanded={aberto}
          aria-controls={idPainel}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={cn(
              "flex-none rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold",
              critico ? "bg-destructive/12 text-destructive" : "bg-muted text-muted-foreground",
            )}
          >
            {grupo.c}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate text-base font-semibold">{grupo.nome}</span>
              {critico && (
                <ShieldAlert
                  className="size-3.5 flex-none text-destructive"
                  aria-label="Requisito com impacto direto sobre vidas"
                />
              )}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">{grupo.eixo}</span>
              <span aria-hidden>·</span>
              <span className="font-semibold text-destructive">
                {grupo.itens.length} {grupo.itens.length === 1 ? "item sem progresso" : "itens sem progresso"}
              </span>
              {marcados > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-semibold text-primary">{marcados} selecionado(s)</span>
                </>
              )}
            </span>
          </span>

          <ChevronDown
            className={cn(
              "size-4 flex-none text-muted-foreground transition-transform duration-200",
              aberto && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      {aberto && (
        <div id={idPainel} className="space-y-2.5 border-t bg-muted/25 px-3 py-3">
          {grupo.lei && (
            <div className="rounded-lg bg-destructive/8 p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
                <Scale className="size-3" aria-hidden />
                Base normativa do requisito
              </p>
              <p className="mt-1 text-xs leading-relaxed">{grupo.lei}</p>
            </div>
          )}

          <ul className="space-y-2">
            {grupo.itens.map((a) => (
              <ItemAchado
                key={codigoAchado(a)}
                achado={a}
                selecionado={selecionados.has(codigoAchado(a))}
                referencias={referenciaPara(referencias, a, nomeEnte)}
                onAlternar={() => onAlternar(codigoAchado(a))}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function AchadoList({
  achados,
  selecionados,
  referencias = {},
  nomeEnte,
  componente = null,
  nomesComponentes = {},
  onLimparComponente,
  onAlternar,
  onSelecionarVarios,
}: {
  achados: Achado[];
  selecionados: Set<string>;
  referencias?: MapaReferencias;
  nomeEnte?: string;
  /** Componente escolhido no mapa de calor acima. */
  componente?: string | null;
  nomesComponentes?: Record<string, string>;
  onLimparComponente?: () => void;
  onAlternar: (codigo: string) => void;
  onSelecionarVarios: (codigos: string[]) => void;
}) {
  const [eixo, setEixo] = useState<string>(TODOS);
  const [soCriticos, setSoCriticos] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const eixos = useMemo(
    () => [TODOS, ...Array.from(new Set(achados.map((a) => a.eixo)))],
    [achados],
  );

  const grupos = useMemo(() => {
    const filtrados = achados.filter(
      (a) =>
        (eixo === TODOS || a.eixo === eixo) &&
        (!soCriticos || ehCritico(a.c)) &&
        (!componente || a.c === componente),
    );
    return agruparPorComponente(filtrados);
  }, [achados, eixo, soCriticos, componente]);

  const qtdCriticos = useMemo(() => achados.filter((a) => ehCritico(a.c)).length, [achados]);
  const codigosVisiveis = grupos.flatMap((g) => g.itens.map(codigoAchado));
  const todosMarcados =
    codigosVisiveis.length > 0 && codigosVisiveis.every((c) => selecionados.has(c));

  const alternarGrupo = (codigos: string[], marcar: boolean) => {
    const proximo = new Set(selecionados);
    for (const c of codigos) {
      if (marcar) proximo.add(c);
      else proximo.delete(c);
    }
    onSelecionarVarios([...proximo]);
  };

  if (!achados.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center">
        <p className="text-sm font-medium">Nenhum requisito sem progresso</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Este ente não apresenta lacunas nesta safra de avaliação — não há o que encaminhar.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="lista-achados" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="lista-achados" className="text-base font-bold">
            Achados agrupados por requisito
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {grupos.length} {grupos.length === 1 ? "requisito" : "requisitos"} ·{" "}
            {codigosVisiveis.length} {codigosVisiveis.length === 1 ? "item" : "itens"} sem progresso
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 text-xs"
          onClick={() => onSelecionarVarios(todosMarcados ? [] : codigosVisiveis)}
        >
          {todosMarcados ? "Limpar seleção" : "Selecionar todos"}
        </Button>
      </div>

      {componente && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Filtrado pelo mapa:</span>
          <strong className="font-semibold">
            {componente} — {nomesComponentes[componente] ?? componente}
          </strong>
          {onLimparComponente && (
            <button
              type="button"
              onClick={onLimparComponente}
              className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary hover:bg-accent"
            >
              <X className="size-3.5" aria-hidden />
              Ver todos
            </button>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar achados">
        {eixos.map((e) => (
          <Button
            key={e}
            size="sm"
            variant={eixo === e ? "default" : "outline"}
            className="h-11 rounded-full px-4 text-xs"
            aria-pressed={eixo === e}
            onClick={() => setEixo(e)}
          >
            {e}
          </Button>
        ))}
        {qtdCriticos > 0 && (
          <Button
            size="sm"
            variant={soCriticos ? "destructive" : "outline"}
            className="h-11 rounded-full px-4 text-xs"
            aria-pressed={soCriticos}
            onClick={() => setSoCriticos((v) => !v)}
          >
            <ShieldAlert className="mr-1 size-3" aria-hidden />
            Risco de vida ({qtdCriticos})
          </Button>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum achado com esses filtros.
        </p>
      ) : (
        <ul className="space-y-2">
          {grupos.map((g) => (
            <GrupoCard
              key={g.c}
              grupo={g}
              selecionados={selecionados}
              referencias={referencias}
              nomeEnte={nomeEnte}
              aberto={aberto === g.c}
              onAbrir={() => setAberto((atual) => (atual === g.c ? null : g.c))}
              onAlternar={onAlternar}
              onAlternarGrupo={alternarGrupo}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
