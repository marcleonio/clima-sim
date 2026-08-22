import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";

import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { formatarPercentual } from "@/lib/achados";
import { GRAFO, listar, type Comunidade } from "@/lib/grafo";
import { cn } from "@/lib/utils";

/**
 * O grafo de semelhança entre entes.
 *
 * Os 51 entes não são 51 casos isolados: agrupam-se pelo *formato* da
 * fragilidade. Dois entes podem ter pontuações muito diferentes e falhar
 * exatamente nos mesmos componentes — e é essa semelhança que permite a
 * pergunta mais útil do produto: "quem tem o meu problema e já resolveu?".
 *
 * DECISÃO DE COR: a identidade da comunidade é carregada pela POSIÇÃO, não por
 * um matiz. Cinco cores categóricas não passam na validação de daltonismo (o
 * par verde/magenta some sob deuteranopia), e a agregação espacial já comunica
 * o grupo. A cor do nó fica livre para a rampa sequencial de déficit — a mesma
 * do resto do produto.
 */

/** Raio pela população, em escala log: senão São Paulo engole a tela. */
function raioDe(pop: number | null): number {
  if (!pop || pop <= 0) return 4;
  return 3.4 + Math.log10(pop) * 0.95;
}

function CartaoComunidade({
  comunidade,
  aberta,
  onAbrir,
  realcado,
  onRealcar,
}: {
  comunidade: Comunidade;
  aberta: boolean;
  onAbrir: () => void;
  realcado: string | null;
  onRealcar: (nome: string | null) => void;
}) {
  const { id, tamanho, pontuacaoMedia, perfil, pontes, generalizavel, entes } = comunidade;

  return (
    <li className={cn("rounded-lg border bg-card transition-colors", aberta && "border-primary")}>
      <button
        type="button"
        onClick={onAbrir}
        aria-expanded={aberta}
        onMouseEnter={() => onRealcar(entes[0] ?? null)}
        onMouseLeave={() => onRealcar(null)}
        className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="grid size-7 flex-none place-items-center rounded-md bg-muted font-mono text-xs font-bold">
          G{id + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {tamanho} {tamanho === 1 ? "ente" : "entes"}
            <span className="ml-1.5 font-normal text-muted-foreground">
              · {formatarPercentual(pontuacaoMedia)} em média
            </span>
          </span>
          <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
            {perfil.map((p) => `${p.c} ${p.deficit}%`).join(" · ")}
          </span>
        </span>
        {!generalizavel && (
          <span
            className="flex-none rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--sev-atencao)]"
            title="Grupo pequeno demais para sustentar generalização"
          >
            pequeno
          </span>
        )}
      </button>

      {aberta && (
        <div className="space-y-2.5 border-t px-3 py-2.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Falham mais em
            </p>
            <ul className="mt-1 space-y-0.5">
              {perfil.map((p) => (
                <li key={p.c} className="flex items-baseline gap-2 text-xs">
                  <span className="font-mono font-bold text-muted-foreground">{p.c}</span>
                  <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                  <span className="font-semibold tabular-nums">{p.deficit}% de déficit</span>
                </li>
              ))}
            </ul>
          </div>

          {pontes.length > 0 && (
            <div className="rounded-lg border border-[var(--sev-ok)]/40 bg-[var(--sev-ok-bg)] p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--sev-ok)]">
                Quem no grupo já resolveu
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {pontes.map((p) => (
                  <li key={p.componente} className="text-xs leading-relaxed">
                    <span className="font-mono font-bold">{p.componente}</span> — {p.falham} do
                    grupo estão sem progresso, mas{" "}
                    <strong className="font-semibold">{listar(p.resolveram)}</strong>{" "}
                    {p.resolveram.length === 1 ? "resolveu" : "resolveram"}.{" "}
                    <Link
                      to="/achados"
                      search={{ ente: p.resolveram[0]!, comp: p.componente }}
                      className="font-semibold text-primary underline underline-offset-2"
                    >
                      ver o parecer
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Entes
            </p>
            <ul className="mt-1 flex flex-wrap gap-1">
              {entes.map((nome) => (
                <li key={nome}>
                  <Link
                    to="/achados"
                    search={{ ente: nome }}
                    onMouseEnter={() => onRealcar(nome)}
                    onMouseLeave={() => onRealcar(null)}
                    className={cn(
                      "inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs transition-colors",
                      realcado === nome ? "border-foreground bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    {nome}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

export function GrafoSemelhanca({
  realcado,
  onRealcar,
  onSelecionar,
}: {
  realcado?: string | null;
  onRealcar?: (nome: string | null) => void;
  onSelecionar?: (nome: string) => void;
}) {
  const [aberta, setAberta] = useState<number | null>(null);
  const emFoco = realcado ?? null;

  /** A comunidade do ente sob o cursor acende inteira. */
  const grupoEmFoco = useMemo(() => {
    if (!emFoco) return null;
    return GRAFO.nos.find((n) => n.nome === emFoco)?.comunidade ?? null;
  }, [emFoco]);

  const opacidadeDo = (nome: string, comunidade: number) => {
    if (!emFoco) return 1;
    if (nome === emFoco) return 1;
    return comunidade === grupoEmFoco ? 0.62 : 0.16;
  };

  return (
    <section aria-labelledby="grafo" className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2">
        <h2 id="grafo" className="text-base font-bold">
          Entes que falham parecido
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          {GRAFO.nos.length} entes ligados pela semelhança do padrão de déficit nos 15 componentes.
          Quem está perto tem o mesmo formato de fragilidade — e quem já resolveu vira precedente
          para os vizinhos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <svg
            viewBox={GRAFO.viewBox}
            className="h-auto w-full text-foreground"
            role="img"
            aria-label={`Grafo de ${GRAFO.nos.length} entes em ${GRAFO.comunidades.length} comunidades, ligados pela semelhança do padrão de déficit. A cor indica a pontuação e o tamanho, a população.`}
          >
            <g>
              {GRAFO.arestas.map((e) => {
                const a = GRAFO.nos.find((n) => n.nome === e.a);
                const b = GRAFO.nos.find((n) => n.nome === e.b);
                if (!a || !b) return null;
                const aceso = emFoco === e.a || emFoco === e.b;
                return (
                  <line
                    key={`${e.a}|${e.b}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="currentColor"
                    strokeWidth={aceso ? 2 : e.interna ? 1.4 : 0.8}
                    opacity={aceso ? 0.6 : emFoco ? 0.06 : e.interna ? 0.3 : 0.1}
                    className="transition-opacity duration-150"
                  />
                );
              })}
            </g>

            <g>
              {GRAFO.nos.map((n) => (
                <circle
                  key={n.nome}
                  cx={n.x}
                  cy={n.y}
                  r={raioDe(n.pop)}
                  fill={`var(--calor-${degrauDeficit(n.pontuacao)})`}
                  stroke="var(--card)"
                  strokeWidth={emFoco === n.nome ? 2.5 : 1.5}
                  opacity={opacidadeDo(n.nome, n.comunidade)}
                  className={cn(
                    "transition-opacity duration-150",
                    onSelecionar && "cursor-pointer",
                  )}
                  tabIndex={onSelecionar ? 0 : undefined}
                  role={onSelecionar ? "button" : undefined}
                  aria-label={`${n.nome}: pontuação ${formatarPercentual(n.pontuacao)}, grupo G${n.comunidade + 1}`}
                  onMouseEnter={() => onRealcar?.(n.nome)}
                  onMouseLeave={() => onRealcar?.(null)}
                  onClick={() => onSelecionar?.(n.nome)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelecionar?.(n.nome);
                    }
                  }}
                />
              ))}
            </g>

            {/* só os maiores de cada grupo levam rótulo, senão vira sopa */}
            <g>
              {GRAFO.comunidades.flatMap((c) =>
                [...c.entes]
                  .map((nome) => GRAFO.nos.find((n) => n.nome === nome)!)
                  .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))
                  .slice(0, 2)
                  .map((n) => (
                    <text
                      key={n.nome}
                      x={n.x}
                      y={n.y - raioDe(n.pop) - 4}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill="currentColor"
                      opacity={emFoco ? (emFoco === n.nome ? 1 : 0.25) : 0.72}
                      className="pointer-events-none transition-opacity duration-150"
                    >
                      {n.nome.replace(/ \(.*\)/, "")}
                    </text>
                  )),
              )}
            </g>
          </svg>

          <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 flex-none" aria-hidden />
            {GRAFO.meta.aviso} A métrica é {GRAFO.meta.metrica}; cada ente se liga aos{" "}
            {GRAFO.meta.vizinhos} mais parecidos.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {GRAFO.comunidades.length} grupos
          </p>
          <ul className="space-y-1.5">
            {GRAFO.comunidades.map((c) => (
              <CartaoComunidade
                key={c.id}
                comunidade={c}
                aberta={aberta === c.id}
                onAbrir={() => setAberta((x) => (x === c.id ? null : c.id))}
                realcado={emFoco}
                onRealcar={(n) => onRealcar?.(n)}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** O bloco de precedentes no dossiê de um ente. */
export function PrecedentesDoEnte({
  nome,
  pontes,
}: {
  nome: string;
  pontes: { componente: string; nome: string; falham: number; resolveram: string[] }[];
}) {
  if (!pontes.length) return null;

  return (
    <section
      aria-labelledby="precedentes"
      className="rounded-xl border border-[var(--sev-ok)]/40 bg-[var(--sev-ok-bg)] p-4"
    >
      <h2 id="precedentes" className="text-base font-bold text-[var(--sev-ok)]">
        Quem tem o mesmo problema e já resolveu
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Entes com o mesmo formato de fragilidade que {nome}, que avançaram onde ele ainda não.
      </p>

      <ul className="mt-3 space-y-2">
        {pontes.map((p) => (
          <li key={p.componente} className="text-sm leading-relaxed">
            <span className="font-mono text-xs font-bold">{p.componente}</span>{" "}
            <strong className="font-semibold">{p.nome}</strong> —{" "}
            {listar(p.resolveram)} {p.resolveram.length === 1 ? "resolveu" : "resolveram"}.{" "}
            <Link
              to="/achados"
              search={{ ente: p.resolveram[0]!, comp: p.componente }}
              className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
            >
              ver o que a auditoria registrou
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        Semelhança de padrão de falha, não causa comum. O que aparece ao abrir é o parecer que o
        auditor escreveu sobre aquele ente — referência a adaptar, não modelo a copiar.
      </p>
    </section>
  );
}
