import { Link } from "@tanstack/react-router";
import { ArrowRight, MousePointerClick } from "lucide-react";

import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { formatarNumero, formatarPercentual } from "@/lib/achados";
import type { EnteResumo } from "@/lib/dados";
import { cn } from "@/lib/utils";

/**
 * O resultado do clique no mapa — ao lado dele, não abaixo.
 *
 * Antes este cartão nascia depois do mapa e depois da legenda, a mais de mil
 * pixels do topo da página. Somado ao reset de rolagem (corrigido na E7), o
 * usuário clicava no meio do mapa e o retorno aparecia longe de onde ele estava
 * olhando — o que é indistinguível de "não aconteceu nada".
 *
 * Ocupa o mesmo espaço com ou sem seleção: o estado vazio explica o que fazer,
 * em vez de deixar um buraco que empurra o layout quando alguém clica.
 */

function Barra({ rotulo, valor, total }: { rotulo: string; valor: number; total: number }) {
  const pct = total ? (valor / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="font-semibold tabular-nums">
          {valor}
          <span className="font-normal text-muted-foreground">/{total}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: `var(--calor-${degrauDeficit(100 - pct)})` }}
        />
      </div>
    </div>
  );
}

export function PainelEnte({
  nome,
  ente,
  componente,
  nomesComponentes,
  mediaNacional,
}: {
  nome: string | null;
  ente: EnteResumo | undefined;
  /** Componente em foco no painel, se houver — o dossiê abre já nele. */
  componente?: string | null;
  nomesComponentes: Record<string, string>;
  mediaNacional: number;
}) {
  if (!nome || !ente) {
    return (
      <div className="flex h-full min-h-44 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
        <MousePointerClick className="size-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-semibold">Nenhum ente selecionado</p>
        <p className="mt-1 max-w-52 text-xs text-muted-foreground">
          Toque num estado ou numa capital no mapa para ver o resumo aqui.
        </p>
      </div>
    );
  }

  const distancia = ente.mat - mediaNacional;
  const acima = distancia >= 0;

  // Os três componentes mais frágeis: é o que uma pessoa quer saber logo depois
  // de "quão ruim está" — onde exatamente está ruim.
  const piores = Object.entries(ente.comps)
    .filter(([, r]) => r.l > 0)
    .sort((a, b) => a[1].m - b[1].m)
    .slice(0, 3);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="min-w-0">
        <h3 className="truncate text-lg font-bold" title={nome}>
          {nome}
        </h3>
        <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {ente.tipo}
          {ente.pop != null && ` · ${formatarNumero(ente.pop)} hab.`}
        </p>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="text-3xl font-bold leading-none tabular-nums">
          {formatarPercentual(ente.mat)}
        </span>
        <span
          className={cn(
            "pb-0.5 text-xs font-semibold",
            acima ? "text-[var(--sev-ok)]" : "text-[var(--sev-critico)]",
          )}
        >
          {acima ? "▲" : "▼"} {Math.abs(distancia).toFixed(1).replace(".", ",")} p.p.
          <span className="block font-normal text-muted-foreground">vs. país</span>
        </span>
      </div>

      <div className="mt-3 border-t pt-3">
        <Barra rotulo="Itens sem progresso" valor={ente.lac} total={ente.tot} />
      </div>

      {piores.length > 0 && (
        <div className="mt-3 min-h-0 flex-1 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menores pontuações
          </p>
          <ul className="mt-1.5 space-y-1">
            {piores.map(([c, r]) => (
              <li key={c} className="flex items-baseline gap-2 text-xs">
                <span
                  className="mt-1 size-2 flex-none rounded-sm"
                  style={{ background: `var(--calor-${degrauDeficit(r.m)})` }}
                  aria-hidden
                />
                <span className="font-mono font-bold text-muted-foreground">{c}</span>
                <span className="min-w-0 flex-1 truncate">{nomesComponentes[c] ?? c}</span>
                <span className="flex-none font-semibold tabular-nums">{Math.round(r.m)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to="/achados"
        search={{ ente: nome, ...(componente ? { comp: componente } : {}) }}
        className={cn(
          "mt-4 flex min-h-11 items-center justify-center gap-1.5 rounded-lg",
          "bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90",
        )}
      >
        Abrir dossiê
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
