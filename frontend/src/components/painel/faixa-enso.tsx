import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { Info, Waves } from "lucide-react";

import { formatarNumero } from "@/lib/achados";
import { associacaoDaFase, descreverFase, ENSO, entesEmAtencao } from "@/lib/enso";
import { cn } from "@/lib/utils";

/**
 * A faixa de contexto sazonal.
 *
 * O produto inteiro olha para trás; esta é a única peça que olha para a próxima
 * estação, e ela consegue fazer isso sem inventar previsão porque os dois lados
 * são dado observado: o ONI é medição da NOAA, e a lacuna é avaliação de
 * tribunal de contas.
 *
 * Tom deliberadamente sóbrio. A tentação de um painel climático é o alarme, e
 * alarme é exatamente o que destrói a credibilidade de um instrumento de
 * controle. A faixa informa e some do caminho.
 */

/** A série recente como linha, com as faixas de evento marcadas. */
function MiniSerie() {
  const id = useId();
  const pontos = ENSO.serie;
  if (pontos.length < 2) return null;

  const L = 240;
  const A = 44;
  const escala = 2.6;
  const y = (v: number) => A / 2 - (v / escala) * (A / 2 - 3);
  const x = (i: number) => (i / (pontos.length - 1)) * L;

  const d = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const ultimo = pontos[pontos.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      className="h-11 w-full max-w-60 text-foreground"
      role="img"
      aria-label={`Índice ONI dos últimos ${ENSO.serie.length} trimestres móveis. Leitura atual: ${ultimo.v}.`}
    >
      <defs>
        <clipPath id={`c-${id}`}>
          <rect x="0" y="0" width={L} height={A} />
        </clipPath>
      </defs>
      {/* faixa neutra, entre -0,5 e +0,5 */}
      <rect x="0" y={y(0.5)} width={L} height={y(-0.5) - y(0.5)} fill="currentColor" opacity="0.07" />
      <line x1="0" y1={y(0)} x2={L} y2={y(0)} stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.75"
        clipPath={`url(#c-${id})`}
      />
      <circle
        cx={x(pontos.length - 1)}
        cy={y(ultimo.v)}
        r="3"
        fill={ultimo.v >= 0.5 ? "var(--calor-4)" : ultimo.v <= -0.5 ? "var(--eixo-gov)" : "currentColor"}
      />
    </svg>
  );
}

export function FaixaEnso({ compacta = false }: { compacta?: boolean }) {
  const associacao = associacaoDaFase(ENSO.atual.fase);
  const atencao = entesEmAtencao(6);
  const evento = ENSO.atual.fase !== "Neutro";

  return (
    <section
      aria-labelledby="enso"
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        evento && "border-[var(--sev-atencao)]/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h2 id="enso" className="flex items-center gap-2 text-base font-bold">
            <Waves className="size-4 text-[var(--eixo-gov)]" aria-hidden />
            Fase climática atual
          </h2>
          <p className="mt-1 text-sm">
            <strong className="font-semibold">{descreverFase()}</strong>
          </p>
          {associacao && (
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              A climatologia associa esta fase a {associacao.padrao}.
            </p>
          )}
        </div>

        <div className="flex-none">
          <MiniSerie />
          <p className="text-right font-mono text-xs text-muted-foreground">
            ONI · {ENSO.serie.length} trimestres
          </p>
        </div>
      </div>

      {!compacta && atencao.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Na região associada, sem ação demonstrada em defesa civil ou adaptação
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {atencao.map((e) => (
              <li key={e.nome}>
                <Link
                  to="/achados"
                  search={{ ente: e.nome, comp: e.criticos[0]! }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--sev-atencao)]/40 bg-[var(--sev-atencao-bg)] px-3 text-xs font-semibold"
                >
                  {e.nome}
                  <span className="font-mono font-normal opacity-70">
                    {e.criticos.join(" ")}
                  </span>
                  {e.ente.pop != null && (
                    <span className="font-normal tabular-nums opacity-60">
                      {formatarNumero(Math.round(e.ente.pop / 1_000_000))}M
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 border-t pt-2.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 flex-none" aria-hidden />
        {ENSO.aviso} O que se registra é a coincidência entre exposição e ausência de ação
        demonstrada. Fonte: {ENSO.fonte}, extração de {ENSO.extraidoEm}.
      </p>
    </section>
  );
}
