import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ListChecks } from "lucide-react";

import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { formatarPercentual } from "@/lib/achados";
import { MOTIVO, passosQueProtegemVida, type Plano, type Motivo } from "@/lib/plano";
import { cn } from "@/lib/utils";

/**
 * O plano de ação.
 *
 * O painel dizia onde está pior; isso é diagnóstico, e diagnóstico sozinho não
 * é acionável. Esta seção responde a pergunta seguinte — "e agora, em que ordem
 * eu ataco?" — e mostra POR QUE cada passo está na posição em que está.
 *
 * A etiqueta de motivo não é enfeite: é a regra de ordenação exposta item a
 * item. Um gestor que discorda da ordem consegue ver de onde ela veio.
 */

const COR_MOTIVO: Record<Motivo, string> = {
  vida: "border-[var(--sev-critico)]/50 bg-[var(--sev-critico-bg)] text-[var(--sev-critico)]",
  alavancagem: "border-[var(--sev-ok)]/50 bg-[var(--sev-ok-bg)] text-[var(--sev-ok)]",
  precedente: "border-[var(--eixo-gov)]/50 bg-[var(--eixo-gov)]/10 text-[var(--eixo-gov)]",
  deficit: "border-border bg-muted text-muted-foreground",
};

export function PlanoAcao({ plano }: { plano: Plano }) {
  const [aberto, setAberto] = useState<string | null>(null);
  if (!plano.passos.length) return null;

  const vidas = passosQueProtegemVida(plano);
  const ganhoTotal = Math.round((plano.pontuacaoAoFim - plano.pontuacaoAtual) * 10) / 10;

  return (
    <section aria-labelledby="plano" className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id="plano" className="flex items-center gap-2 text-base font-bold">
            <ListChecks className="size-4 text-primary" aria-hidden />
            Plano de ação
          </h2>
          <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
            {plano.passos.length} {plano.passos.length === 1 ? "componente" : "componentes"} para
            corrigir, em ordem
            {vidas > 0 && (
              <>
                {" "}
                — <strong className="font-semibold text-[var(--sev-critico)]">
                  {vidas} {vidas === 1 ? "protege" : "protegem"} vida
                </strong>{" "}
                e {vidas === 1 ? "vem" : "vêm"} primeiro
              </>
            )}
            .
          </p>
        </div>

        <p className="flex-none text-sm">
          <span className="text-muted-foreground">Cumprindo tudo: </span>
          <strong className="tabular-nums">{formatarPercentual(plano.pontuacaoAtual)}</strong>
          <span className="mx-1 text-muted-foreground" aria-hidden>
            →
          </span>
          <strong className="tabular-nums text-[var(--sev-ok)]">
            {formatarPercentual(plano.pontuacaoAoFim)}
          </strong>
          <span className="ml-1 text-xs text-muted-foreground tabular-nums">
            (+{ganhoTotal.toFixed(1).replace(".", ",")} p.p.)
          </span>
        </p>
      </div>

      <ol className="mt-3 divide-y rounded-lg border">
        {plano.passos.map((p) => {
          const expandido = aberto === p.componente;
          return (
            <li key={p.componente}>
              <button
                type="button"
                onClick={() => setAberto((x) => (x === p.componente ? null : p.componente))}
                aria-expanded={expandido}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  expandido && "bg-accent/40",
                )}
              >
                <span className="grid size-6 flex-none place-items-center rounded-md bg-muted font-mono text-xs font-bold tabular-nums">
                  {p.ordem}
                </span>

                <span
                  className="size-3 flex-none rounded-sm"
                  style={{ background: `var(--calor-${degrauDeficit(p.pontuacao)})` }}
                  aria-hidden
                />

                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {p.componente}
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {p.nomeComponente}
                    </span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1">
                    {p.motivos.map((m) => (
                      <span
                        key={m}
                        className={cn(
                          "rounded border px-1.5 py-px text-xs font-semibold",
                          COR_MOTIVO[m],
                        )}
                      >
                        {MOTIVO[m].rotulo}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      {p.semProgresso}/{p.avaliados} sem progresso
                    </span>
                  </span>
                </span>

                <span className="flex-none text-right">
                  <span className="block text-sm font-semibold tabular-nums text-[var(--sev-ok)]">
                    +{p.ganhoSePontuar.toFixed(1).replace(".", ",")}
                  </span>
                  <span className="block text-xs text-muted-foreground">p.p.</span>
                </span>
              </button>

              {expandido && (
                <div className="space-y-2 border-t bg-muted/25 px-3 py-2.5 pl-11">
                  <ul className="space-y-1">
                    {p.motivos.map((m) => (
                      <li key={m} className="text-xs leading-relaxed">
                        <strong className="font-semibold">{MOTIVO[m].rotulo}:</strong>{" "}
                        <span className="text-muted-foreground">{MOTIVO[m].explica}</span>
                      </li>
                    ))}
                  </ul>

                  {p.precedente && (
                    <p className="text-xs leading-relaxed">
                      <strong className="font-semibold">
                        {p.precedente.resolveram.join(" e ")}
                      </strong>{" "}
                      {p.precedente.resolveram.length === 1 ? "resolveu" : "resolveram"} este
                      componente.{" "}
                      <Link
                        to="/achados"
                        search={{ ente: p.precedente.resolveram[0]!, comp: p.componente }}
                        className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
                      >
                        ver o que a auditoria registrou
                        <ArrowRight className="size-3" aria-hidden />
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        {plano.criterio}
      </p>
    </section>
  );
}
