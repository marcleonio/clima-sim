import { useState } from "react";
import type { EntityScores } from "@/lib/clima-api";

const EIXOS_MAPA = [
  { chave: "scoreGeralMedia", rotulo: "Índice geral" },
  { chave: "scoreGovernanca", rotulo: "Governança" },
  { chave: "scorePoliticasPublicas", rotulo: "Políticas Públicas" },
  { chave: "scoreFinanciamento", rotulo: "Financiamento" },
] as const;

type ChaveEixo = (typeof EIXOS_MAPA)[number]["chave"];

function corDoScore(valor: number, min: number, max: number) {
  const t = max > min ? (valor - min) / (max - min) : 0.5;
  // de âmbar (baixo) para verde floresta (alto)
  const hue = 40 + t * 105;
  return `oklch(${0.92 - t * 0.35} ${0.09 + t * 0.06} ${hue})`;
}

export function ScoreHeatmap({
  entidades,
  destaque,
}: {
  entidades: EntityScores[];
  destaque?: string;
}) {
  const [eixo, setEixo] = useState<ChaveEixo>("scoreGeralMedia");

  const itens = [...entidades].sort((a, b) => b[eixo] - a[eixo]);
  if (!itens.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem entidades carregadas para montar o mapa de calor.
      </p>
    );
  }
  const valores = itens.map((e) => e[eixo]);
  const min = Math.min(...valores);
  const max = Math.max(...valores);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl bg-secondary p-1">
        {EIXOS_MAPA.map((op) => (
          <button
            key={op.chave}
            type="button"
            onClick={() => setEixo(op.chave)}
            aria-pressed={eixo === op.chave}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              eixo === op.chave
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {op.rotulo}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {itens.map((e) => {
          const valor = e[eixo];
          return (
            <div
              key={`${e.entityType}:${e.entityName}`}
              className={`rounded-xl p-3 ${
                e.entityName === destaque ? "ring-2 ring-foreground/60" : ""
              }`}
              style={{ backgroundColor: corDoScore(valor, min, max) }}
              title={`${e.entityName}: ${valor.toFixed(1)}`}
            >
              <p className="truncate text-xs font-semibold text-foreground/90">{e.entityName}</p>
              <p className="font-display text-xl tabular-nums text-foreground">
                {valor.toFixed(1)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{min.toFixed(1)}</span>
        <div
          className="h-2 flex-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${corDoScore(min, min, max)}, ${corDoScore(max, min, max)})`,
          }}
        />
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}
