import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";

import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { TiraPontuacao } from "@/components/graficos/legenda-pontuacao";
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
 * TRÊS DECISÕES DE DESENHO
 *
 * 1. A identidade do grupo é POSIÇÃO + CONTORNO, não matiz. Cinco cores
 *    categóricas não passam na validação de daltonismo — o par verde/magenta
 *    some sob deuteranopia. O contorno faz o olho agrupar sem gastar o canal de
 *    cor, que fica livre para a rampa de pontuação, a mesma do resto do produto.
 *
 * 2. Estado usa SIGLA, capital usa o nome da cidade. Antes o rótulo removia o
 *    sufixo, e "São Paulo (estado)" e "São Paulo (capital)" viravam dois "São
 *    Paulo" idênticos no desenho — apagando justamente a distinção que o
 *    produto levou uma etapa inteira para recuperar.
 *
 * 3. O perfil do grupo é BARRA, não texto. "P5 79% · P2 71% · F1 64%" é
 *    despejo; três barras dizem o mesmo e deixam comparar grupos de relance.
 */

/** Raio pela população, em escala log: senão São Paulo engole a tela. */
function raioDe(pop: number | null): number {
  if (!pop || pop <= 0) return 4;
  return 3.4 + Math.log10(pop) * 0.95;
}

/** O contorno como caminho fechado com cantos arredondados. */
function caminhoDoContorno(pontos: { x: number; y: number }[]): string {
  if (pontos.length < 3) return "";
  const meio = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  let d = "";
  for (let i = 0; i < pontos.length; i += 1) {
    const atual = pontos[i]!;
    const proximo = pontos[(i + 1) % pontos.length]!;
    const m = meio(atual, proximo);
    if (i === 0) {
      const anterior = pontos[pontos.length - 1]!;
      const inicio = meio(anterior, atual);
      d += `M${inicio.x},${inicio.y}`;
    }
    d += `Q${atual.x},${atual.y} ${m.x},${m.y}`;
  }
  return `${d}Z`;
}

/** O perfil de déficit do grupo, em três barras. */
function PerfilDoGrupo({ perfil }: { perfil: Comunidade["perfil"] }) {
  return (
    <ul className="space-y-1">
      {perfil.map((p) => (
        <li key={p.c} className="flex items-center gap-2">
          <span className="w-6 flex-none font-mono text-xs font-bold text-muted-foreground">
            {p.c}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs">{p.nome}</span>
          <span className="h-2 w-16 flex-none overflow-hidden rounded-sm bg-muted">
            <span
              className="block h-full rounded-sm"
              style={{
                width: `${p.deficit}%`,
                background: `var(--calor-${degrauDeficit(100 - p.deficit)})`,
              }}
            />
          </span>
          <span className="w-9 flex-none text-right text-xs font-semibold tabular-nums">
            {p.deficit}%
          </span>
        </li>
      ))}
    </ul>
  );
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
  const { id, tamanho, pontuacaoMedia, perfil, pontes, generalizavel, entes, caracter } = comunidade;
  const doGrupo = realcado ? entes.includes(realcado) : false;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border bg-card transition-colors",
        aberta && "border-primary",
        !aberta && doGrupo && "border-foreground/40 bg-accent/30",
      )}
    >
      <button
        type="button"
        onClick={onAbrir}
        aria-expanded={aberta}
        onMouseEnter={() => onRealcar(entes[0] ?? null)}
        onMouseLeave={() => onRealcar(null)}
        className="w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground">G{id + 1}</span>
            <span className="min-w-0 truncate text-sm font-semibold">
              {caracter?.marca ?? "Perfil misto"}
            </span>
          </span>
          {!generalizavel && (
            <span
              className="flex-none rounded bg-[var(--sev-atencao-bg)] px-1.5 text-xs font-semibold text-[var(--sev-atencao)]"
              title="Grupo pequeno demais para sustentar generalização"
            >
              pequeno
            </span>
          )}
        </div>

        {/*
          O nome do grupo é o que o DISTINGUE, não o maior déficit absoluto —
          F3 lidera em quase todo lugar e três grupos ficariam com o mesmo nome.
          Esta linha diz o quanto ele se afasta da média dos grupos.
        */}
        {caracter?.componente && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {caracter.tipo === "forte" ? (
              <>
                Nenhum componente acima da média dos grupos; o melhor é{" "}
                <span className="font-mono font-semibold">{caracter.componente}</span>
              </>
            ) : (
              <>
                <span className="font-mono font-semibold">{caracter.componente}</span> está{" "}
                <strong className="font-semibold text-foreground tabular-nums">
                  {caracter.desvio} p.p.
                </strong>{" "}
                acima da média dos grupos
              </>
            )}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2.5 text-xs text-muted-foreground">
          {/* a contagem como forma, não só como número */}
          <span className="flex items-center gap-[3px]" aria-hidden>
            {Array.from({ length: Math.min(tamanho, 14) }, (_, i) => (
              <span
                key={i}
                className="block size-1.5 rounded-full"
                style={{ background: `var(--calor-${degrauDeficit(pontuacaoMedia)})` }}
              />
            ))}
          </span>
          <span className="tabular-nums">
            {tamanho} {tamanho === 1 ? "ente" : "entes"}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{formatarPercentual(pontuacaoMedia)} em média</span>
        </div>
      </button>

      {aberta && (
        <div className="space-y-3 border-t bg-muted/20 px-3 py-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Maior déficit
            </p>
            <PerfilDoGrupo perfil={perfil} />
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
                    grupo sem progresso, mas{" "}
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
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Entes
            </p>
            <ul className="flex flex-wrap gap-1">
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

  const porNome = useMemo(() => new Map(GRAFO.nos.map((n) => [n.nome, n])), []);
  const grupoEmFoco = emFoco ? (porNome.get(emFoco)?.comunidade ?? null) : null;

  const opacidadeDo = (nome: string, comunidade: number) => {
    if (!emFoco) return 1;
    if (nome === emFoco) return 1;
    return comunidade === grupoEmFoco ? 0.55 : 0.12;
  };

  return (
    <section aria-labelledby="grafo" className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 id="grafo" className="text-base font-bold">
            Entes que falham parecido
          </h2>
          <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
            Quem está perto tem o mesmo formato de fragilidade — e quem já resolveu vira precedente
            para os vizinhos.
          </p>
        </div>
        <TiraPontuacao />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <svg
            viewBox="-30 -30 820 620"
            className="h-auto w-full text-foreground"
            role="img"
            aria-label={`Grafo de ${GRAFO.nos.length} entes em ${GRAFO.comunidades.length} comunidades, ligados pela semelhança do padrão de déficit. A cor indica a pontuação e o tamanho, a população.`}
          >
            {/* contorno de cada grupo: agrupa sem gastar o canal de cor */}
            <g>
              {GRAFO.comunidades.map((c) =>
                c.contorno ? (
                  <path
                    key={c.id}
                    d={caminhoDoContorno(c.contorno)}
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="transition-opacity duration-200"
                    opacity={grupoEmFoco === c.id ? 0.07 : grupoEmFoco != null ? 0.02 : 0.04}
                  />
                ) : null,
              )}
            </g>

            <g>
              {GRAFO.arestas.map((e) => {
                const a = porNome.get(e.a);
                const b = porNome.get(e.b);
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
                    strokeWidth={aceso ? 2 : e.interna ? 1.2 : 0.7}
                    opacity={aceso ? 0.55 : emFoco ? 0.05 : e.interna ? 0.24 : 0.08}
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
                  stroke={emFoco === n.nome ? "var(--foreground)" : "var(--card)"}
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

            {/*
              Rótulos: os dois maiores de cada grupo sempre, mais o que estiver
              sob o cursor. Rotular os 51 vira sopa; rotular nenhum tira a
              âncora que o leitor precisa para se situar.
            */}
            <g className="pointer-events-none">
              {GRAFO.comunidades
                .flatMap((c) =>
                  c.entes
                    .map((nome) => porNome.get(nome)!)
                    .filter(Boolean)
                    .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))
                    .slice(0, 2),
                )
                .concat(emFoco && porNome.get(emFoco) ? [porNome.get(emFoco)!] : [])
                .filter((n, i, arr) => arr.findIndex((x) => x.nome === n.nome) === i)
                .map((n) => {
                  const destacado = emFoco === n.nome;
                  return (
                    <text
                      key={n.nome}
                      x={n.x}
                      y={n.y - raioDe(n.pop) - 5}
                      fontSize={destacado ? 12 : 10}
                      fontWeight={destacado ? 700 : 500}
                      textAnchor="middle"
                      fill="currentColor"
                      opacity={emFoco ? (destacado ? 1 : 0.22) : 0.68}
                      className="transition-opacity duration-150"
                      style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                    >
                      {n.curto}
                    </text>
                  );
                })}
            </g>
          </svg>

          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 flex-none" aria-hidden />
            {GRAFO.meta.aviso} Estado aparece pela sigla, capital pelo nome. Métrica:{" "}
            {GRAFO.meta.metrica}; cada ente se liga aos {GRAFO.meta.vizinhos} mais parecidos.
          </p>
        </div>

        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {GRAFO.comunidades.length} grupos · toque para abrir
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
            <strong className="font-semibold">{p.nome}</strong> — {listar(p.resolveram)}{" "}
            {p.resolveram.length === 1 ? "resolveu" : "resolveram"}.{" "}
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
