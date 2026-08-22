import { AlertTriangle, ShieldCheck, TriangleAlert, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatarNumero,
  formatarPercentual,
  ROTULO_SEVERIDADE,
  severidade,
  taxaLacuna,
  type Ente,
  type MediaNacional,
  type Severidade,
} from "@/lib/achados";

const ICONE: Record<Severidade, typeof AlertTriangle> = {
  critico: AlertTriangle,
  atencao: TriangleAlert,
  maduro: ShieldCheck,
};

/** Cor da severidade sobre o painel escuro — lima e vermelho da paleta Climaton. */
const TOM: Record<Severidade, { chip: string; num: string }> = {
  critico: { chip: "bg-red-500/20 text-red-200 ring-1 ring-red-400/40", num: "text-red-300" },
  atencao: { chip: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40", num: "text-amber-200" },
  maduro: { chip: "bg-lime-300/20 text-lime-100 ring-1 ring-lime-300/40", num: "text-lime-200" },
};

const RAIO = 34;
const CENTRO = 44;

function vertice(i: number, n: number, f: number): [number, number] {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [CENTRO + Math.cos(a) * RAIO * f, CENTRO + Math.sin(a) * RAIO * f];
}

function forma(valores: number[], escala = 1): string {
  return (
    valores
      .map((v, i) => {
        const [x, y] = vertice(i, valores.length, (Math.max(0, Math.min(100, v)) / 100) * escala);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

function Metrica({
  valor,
  rotulo,
  tom,
}: {
  valor: string;
  rotulo: string;
  tom?: string;
}) {
  return (
    <div className="min-w-0">
      <div className={cn("text-xl font-bold leading-none tabular-nums sm:text-2xl", tom ?? "text-white")}>
        {valor}
      </div>
      <p className="mt-1.5 text-xs leading-tight text-white/60">{rotulo}</p>
    </div>
  );
}

export function EntitySummary({
  nome,
  ente,
  snapshot,
  nacional,
  mediaNacionalGeral,
}: {
  nome: string;
  ente: Ente;
  snapshot: string;
  nacional: Record<string, MediaNacional>;
  mediaNacionalGeral: number;
}) {
  const taxa = taxaLacuna(ente);
  const sev = severidade(taxa);
  const Icone = ICONE[sev];
  const tom = TOM[sev];

  const eixos = Object.entries(ente.eixos);
  const valoresEnte = eixos.map(([, r]) => r.m);
  const valoresPais = eixos.map(([e]) => nacional[e]?.m ?? 0);

  const acima = ente.mat >= mediaNacionalGeral;
  const distancia = Math.abs(ente.mat - mediaNacionalGeral);

  return (
    <section
      aria-labelledby="resumo-ente"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#00351A] via-[#005222] to-[#017147] shadow-lg"
    >
      {/* faixa de identificação */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <h1 id="resumo-ente" className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {nome}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-wider text-white/55">
            <span>{ente.tipo}</span>
            {ente.pop != null && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" aria-hidden />
                  {formatarNumero(ente.pop)} hab.
                </span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>avaliação {snapshot}</span>
          </p>
        </div>

        <span
          className={cn(
            "inline-flex flex-none items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest",
            tom.chip,
          )}
        >
          <Icone className="size-3.5" aria-hidden />
          {ROTULO_SEVERIDADE[sev]}
        </span>
      </div>

      {/* corpo: número dominante + métricas + radar */}
      <div className="grid gap-5 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
        <div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="text-5xl font-black leading-none tracking-tight text-white tabular-nums sm:text-6xl">
              {formatarPercentual(ente.mat)}
            </span>
            <div className="pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-lime-300">
                Maturidade climática
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                {acima ? "▲" : "▼"} {distancia.toFixed(1).replace(".", ",")} pontos{" "}
                {acima ? "acima" : "abaixo"} do país ({formatarPercentual(mediaNacionalGeral)})
              </p>
            </div>
          </div>

          {/* trilha comparativa: posição do ente contra o país */}
          <div className="relative mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/12">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-lime-300"
              style={{ width: `${Math.max(0, Math.min(100, ente.mat))}%` }}
            />
            <div
              className="absolute inset-y-[-3px] w-0.5 bg-white/70"
              style={{ left: `${Math.max(0, Math.min(100, mediaNacionalGeral))}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-1.5 max-w-md text-right font-mono text-xs uppercase tracking-wider text-white/40">
            marca branca = média nacional
          </p>

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/12 pt-4 sm:max-w-md">
            <Metrica valor={String(ente.tot)} rotulo="requisitos avaliados" />
            <Metrica valor={String(ente.lac)} rotulo="sem qualquer ação" tom={tom.num} />
            <Metrica valor={`${ente.rank}º`} rotulo="em fragilidade, de 49" />
          </div>
        </div>

        {/* radar compacto embutido */}
        <div className="flex min-w-0 items-center gap-4 lg:flex-col lg:items-end">
          <svg
            viewBox="0 0 88 88"
            className="size-24 flex-none sm:size-28"
            role="img"
            aria-label={`Perfil por eixo: ${eixos
              .map(([e, r]) => `${e} ${r.m.toFixed(0)} contra ${(nacional[e]?.m ?? 0).toFixed(0)} do país`)
              .join("; ")}.`}
          >
            {[0.33, 0.66, 1].map((f) => (
              <path
                key={f}
                d={forma(
                  valoresEnte.map(() => 100),
                  f,
                )}
                fill="none"
                stroke="rgb(255 255 255 / .18)"
                strokeWidth={1}
              />
            ))}
            <path
              d={forma(valoresPais)}
              fill="rgb(255 255 255 / .16)"
              stroke="rgb(255 255 255 / .5)"
              strokeWidth={1.2}
              strokeDasharray="3 2"
            />
            <path d={forma(valoresEnte)} fill="rgb(216 232 20 / .35)" stroke="#D8E814" strokeWidth={2} />
            {valoresEnte.map((v, i) => {
              const [x, y] = vertice(i, valoresEnte.length, Math.max(0, Math.min(100, v)) / 100);
              return <circle key={eixos[i]?.[0]} cx={x} cy={y} r={2.4} fill="#D8E814" />;
            })}
          </svg>

          <ul className="min-w-0 flex-1 space-y-1 lg:w-40 lg:flex-none">
            {eixos.map(([nomeEixo, r], i) => {
              const pais = valoresPais[i] ?? 0;
              const melhor = r.m >= pais;
              return (
                <li key={nomeEixo} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-white/60">
                    {nomeEixo === "Políticas públicas" ? "Políticas" : nomeEixo}
                  </span>
                  <span className="flex flex-none items-center gap-1 tabular-nums">
                    <span className="font-bold text-white">{r.m.toFixed(0)}</span>
                    <span className={melhor ? "text-lime-300" : "text-red-300"}>
                      {melhor ? "▲" : "▼"}
                      {Math.abs(r.m - pais).toFixed(0)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
