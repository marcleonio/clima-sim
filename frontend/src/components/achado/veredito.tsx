import { AlertTriangle, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatarNumero } from "@/lib/achados";
import type { Severidade, Veredito as DadosVeredito } from "@/lib/achados";
import type { FinancasEnte } from "@/lib/dados";

/**
 * A resposta antes da grade.
 *
 * Quem abre o dossiê de um ente veio buscar uma conclusão, não uma grade de 15
 * cartões para interpretar. Em Boa Vista, 14 dos 15 componentes marcam zero — a
 * grade gastava a dobra inteira para dizer uma coisa só. Aqui essa coisa é dita
 * em uma frase construída do dado, e a grade vira detalhe.
 */

const ICONE: Record<Severidade, typeof AlertTriangle> = {
  critico: AlertTriangle,
  atencao: TriangleAlert,
  maduro: ShieldCheck,
};

const TOM: Record<Severidade, { borda: string; fundo: string; tinta: string }> = {
  critico: {
    borda: "border-[var(--sev-critico)]/45",
    fundo: "bg-[var(--sev-critico-bg)]",
    tinta: "text-[var(--sev-critico)]",
  },
  atencao: {
    borda: "border-[var(--sev-atencao)]/45",
    fundo: "bg-[var(--sev-atencao-bg)]",
    tinta: "text-[var(--sev-atencao)]",
  },
  maduro: {
    borda: "border-[var(--sev-ok)]/45",
    fundo: "bg-[var(--sev-ok-bg)]",
    tinta: "text-[var(--sev-ok)]",
  },
};

export function Veredito({
  veredito,
  financas,
}: {
  veredito: DadosVeredito;
  /** Capacidade fiscal, quando o ente publicou a DCA. */
  financas?: FinancasEnte | undefined;
}) {
  const { titulo, contexto, alerta, severidade } = veredito;
  const Icone = ICONE[severidade];
  const tom = TOM[severidade];

  return (
    <section
      aria-labelledby="veredito"
      className={cn("rounded-xl border-2 p-5 shadow-sm sm:p-6", tom.borda, tom.fundo)}
    >
      <div className="flex items-start gap-3">
        <Icone className={cn("mt-1 size-5 flex-none", tom.tinta)} aria-hidden />
        <div className="min-w-0">
          <h2
            id="veredito"
            className="text-pretty text-xl font-bold leading-snug sm:text-2xl"
          >
            {titulo}
          </h2>
          <p className="mt-2 max-w-prose text-pretty text-base leading-relaxed text-foreground/80">
            {contexto}
          </p>

          {/*
            O eixo Financiamento é o mais frágil do país. "Não destinou
            orçamento ao clima" significa coisas diferentes num ente que
            arrecada bilhões e num que arrecada milhões — este número é o que
            separa "não gastou" de "não tinha".
          */}
          {financas && (
            <p className="mt-3 text-sm text-foreground/70">
              Arrecadou{" "}
              <strong className="font-semibold tabular-nums text-foreground">
                R$ {formatarNumero(Math.round(financas.receita / 1_000_000))} milhões
              </strong>{" "}
              em {financas.exercicio}
              {financas.perCapita != null && (
                <>
                  {" "}
                  — R$ {formatarNumero(financas.perCapita)} por habitante
                </>
              )}
              . <span className="text-muted-foreground">Fonte: SICONFI / Tesouro Nacional.</span>
            </p>
          )}

          {alerta && (
            <p
              className={cn(
                "mt-3 inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                tom.borda,
                tom.tinta,
              )}
            >
              <ShieldAlert className="mt-0.5 size-4 flex-none" aria-hidden />
              <span className="text-pretty">{alerta}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
