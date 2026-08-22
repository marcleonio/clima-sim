import { useId, useState } from "react";

import { formatarNumero, formatarPercentual } from "@/lib/achados";
import { NOME_DEGRAU, type Degrau } from "@/lib/trajetoria";
import { cn } from "@/lib/utils";

/**
 * As formas que os números do painel passam a ter.
 *
 * A regra que organiza este arquivo: **o trabalho do número escolhe a forma**.
 * Quatro cartões idênticos com quatro números grandes é o que não fazer — cada
 * um desses números responde a uma pergunta diferente, e uma parte-no-todo não
 * se lê do mesmo jeito que uma posição numa distribuição.
 *
 * Tudo aqui é SVG e CSS puros. Nenhuma biblioteca de gráfico: as formas são
 * simples o bastante para não justificar 100 KB de runtime, e assim herdam a
 * paleta por variável CSS, funcionam nos dois temas e imprimem com a página.
 */

// ─────────────────────────────────────────────── composição por degrau

/**
 * Os quatro estágios da escala oficial numa barra só.
 *
 * Diz numa forma o que "640 de 2.245" não diz: a diferença entre um recorte
 * onde tudo está zerado e outro onde muita coisa já começou. Para quem produz
 * política pública, essa diferença é a decisão inteira.
 */
export function BarraDegraus({
  degraus,
  altura = "md",
  mostrarLegenda = true,
}: {
  degraus: readonly [number, number, number, number];
  altura?: "sm" | "md";
  mostrarLegenda?: boolean;
}) {
  const total = degraus.reduce((s, v) => s + v, 0);
  if (!total) return null;

  // Do pior para o melhor: o olho entra pela esquerda e encontra o problema.
  const faixas = degraus.map((qtd, i) => ({
    grau: i as Degrau,
    qtd,
    pct: (qtd / total) * 100,
    cor: `var(--calor-${[5, 3, 1, 0][i]})`,
    tinta: `var(--calor-${[5, 3, 1, 0][i]}-tinta)`,
  }));

  return (
    <div>
      <div
        className={cn(
          "flex w-full gap-[2px] overflow-hidden rounded",
          altura === "sm" ? "h-3" : "h-7",
        )}
        role="img"
        aria-label={faixas
          .filter((f) => f.qtd > 0)
          .map((f) => `${NOME_DEGRAU[f.grau]}: ${f.qtd} de ${total}`)
          .join("; ")}
      >
        {faixas.map(
          (f) =>
            f.qtd > 0 && (
              <span
                key={f.grau}
                className="grid place-items-center overflow-hidden transition-[flex-grow] duration-300"
                style={{ flexGrow: f.qtd, background: f.cor, color: f.tinta }}
                title={`${NOME_DEGRAU[f.grau]}: ${f.qtd}`}
              >
                {altura === "md" && f.pct >= 9 && (
                  <span className="text-xs font-bold tabular-nums">{f.qtd}</span>
                )}
              </span>
            ),
        )}
      </div>

      {mostrarLegenda && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {faixas.map(
            (f) =>
              f.qtd > 0 && (
                <li key={f.grau} className="flex items-center gap-1.5">
                  <span
                    className="block size-2.5 flex-none rounded-[2px]"
                    style={{ background: f.cor }}
                    aria-hidden
                  />
                  {NOME_DEGRAU[f.grau]}
                </li>
              ),
          )}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────── faixa de distribuição

/**
 * Onde cada ente cai na régua de 0 a 100.
 *
 * Uma média sozinha esconde se o recorte é homogêneo ou se tem dois grupos em
 * extremos opostos — e as duas situações pedem ações completamente diferentes.
 * Cada ente é um traço fino; a média do recorte é o traço grosso; a nacional é
 * a linha de referência.
 */
export function FaixaDistribuicao({
  pontos,
  media,
  referencia,
  realcado,
  onRealcar,
}: {
  pontos: { nome: string; maturidade: number }[];
  media: number;
  /** A média nacional, como linha de comparação. */
  referencia: number;
  realcado?: string | null;
  onRealcar?: (nome: string | null) => void;
}) {
  if (!pontos.length) return null;

  return (
    <div>
      <div className="relative h-9">
        {/* trilho com as faixas oficiais: até 33% desafio, a partir de 67% ponto forte */}
        <div className="absolute inset-x-0 top-3 flex h-3 overflow-hidden rounded-sm">
          <span className="h-full" style={{ width: "33%", background: "var(--calor-4)", opacity: 0.22 }} />
          <span className="h-full flex-1 bg-muted" />
          <span className="h-full" style={{ width: "33%", background: "var(--calor-0)", opacity: 0.7 }} />
        </div>

        {/* um traço por ente */}
        {pontos.map((p) => {
          const aceso = realcado === p.nome;
          return (
            <span
              key={p.nome}
              className={cn(
                "absolute top-2 w-[2px] -translate-x-1/2 rounded-full transition-[height,opacity] duration-150",
                aceso ? "z-10 h-5 opacity-100" : "h-4 opacity-45",
              )}
              style={{
                left: `${p.maturidade}%`,
                background: aceso ? "var(--foreground)" : "var(--muted-foreground)",
              }}
              title={`${p.nome}: ${formatarPercentual(p.maturidade)}`}
              onMouseEnter={() => onRealcar?.(p.nome)}
              onMouseLeave={() => onRealcar?.(null)}
            />
          );
        })}

        {/* média nacional */}
        <span
          className="absolute top-1 h-7 w-px -translate-x-1/2 border-l border-dashed border-foreground/50"
          style={{ left: `${referencia}%` }}
          title={`Média nacional: ${formatarPercentual(referencia)}`}
        />

        {/* média do recorte */}
        <span
          className="absolute top-0.5 h-8 w-[3px] -translate-x-1/2 rounded-full bg-primary"
          style={{ left: `${media}%` }}
          title={`Média do recorte: ${formatarPercentual(media)}`}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span className="text-primary">
          <strong className="font-semibold">{formatarPercentual(media)}</strong> no recorte
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────── barras proporcionais

/**
 * Duas populações contra o mesmo total.
 *
 * O número sozinho ("106.511.751") não diz se é muito ou pouco. Contra o total
 * sob jurisdição, diz.
 */
export function BarrasProporcionais({
  total,
  series,
}: {
  total: number;
  series: { rotulo: string; valor: number; tom?: "critico" | "neutro" }[];
}) {
  return (
    <ul className="space-y-2.5">
      {series.map((s) => {
        const pct = total ? (s.valor / total) * 100 : 0;
        return (
          <li key={s.rotulo}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 text-muted-foreground">{s.rotulo}</span>
              <span className="flex-none font-semibold tabular-nums">
                {formatarPercentual(pct, 0)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${pct}%`,
                  background: s.tom === "critico" ? "var(--calor-4)" : "var(--muted-foreground)",
                }}
              />
            </div>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {formatarNumero(s.valor)} de {formatarNumero(total)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────── perfil divergente

/**
 * O ente contra o país, componente a componente.
 *
 * Quinze comparações numa forma só. O eixo zero faz o trabalho que hoje é feito
 * por quinze textos "▲ 8 vs país": à esquerda é abaixo do país, à direita é
 * acima, e o comprimento é a distância.
 */
export function PerfilDivergente({
  itens,
  onSelecionar,
  selecionado,
}: {
  itens: { c: string; nome: string; delta: number; maturidade: number; lacunas: number }[];
  onSelecionar?: (c: string) => void;
  selecionado?: string | null;
}) {
  if (!itens.length) return null;

  const maior = Math.max(...itens.map((i) => Math.abs(i.delta)), 10);

  return (
    <ul className="space-y-0.5">
      {itens.map((i) => {
        const acima = i.delta >= 0;
        const largura = (Math.abs(i.delta) / maior) * 50;
        const podeClicar = Boolean(onSelecionar) && i.lacunas > 0;
        const ativo = selecionado === i.c;

        const miolo = (
          <>
            <span className="w-7 flex-none font-mono text-xs font-bold text-muted-foreground">
              {i.c}
            </span>
            <span className="relative h-4 min-w-0 flex-1">
              {/* eixo zero */}
              <span className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden />
              <span
                className="absolute inset-y-0.5 rounded-sm transition-[width] duration-300"
                style={{
                  [acima ? "left" : "right"]: "50%",
                  width: `${largura}%`,
                  background: acima ? "var(--calor-0)" : `var(--calor-${i.lacunas > 0 ? 4 : 2})`,
                }}
              />
            </span>
            <span
              className={cn(
                "w-14 flex-none text-right text-xs font-semibold tabular-nums",
                acima ? "text-[var(--sev-ok)]" : "text-[var(--sev-critico)]",
              )}
            >
              {acima ? "+" : "−"}
              {Math.abs(i.delta).toFixed(0)} p.p.
            </span>
          </>
        );

        return (
          <li key={i.c}>
            {podeClicar ? (
              <button
                type="button"
                onClick={() => onSelecionar?.(i.c)}
                aria-pressed={ativo}
                title={`${i.nome}: ${formatarPercentual(i.maturidade)}`}
                className={cn(
                  "flex min-h-9 w-full items-center gap-2 rounded px-1 text-left hover:bg-accent/50",
                  ativo && "bg-accent",
                )}
              >
                {miolo}
              </button>
            ) : (
              <span
                className="flex min-h-9 items-center gap-2 px-1"
                title={`${i.nome}: ${formatarPercentual(i.maturidade)}`}
              >
                {miolo}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────── trajetória

/**
 * A linha honesta.
 *
 * Não é previsão: a base tem uma única extração, e um modelo que projetasse
 * esses valores no tempo seria o simulador OLS que foi removido. Isto é a
 * consequência aritmética da escala oficial — o usuário escolhe quantos itens
 * sobem um degrau, e a reta resultante É o argumento: como o índice é a média
 * dos degraus, cada item regularizado vale exatamente o mesmo. Não há atalho
 * nem rendimento decrescente inventado.
 */
export function TrajetoriaLinha({
  atual,
  lacunas,
  total,
  escolhidos,
  onEscolher,
  posicaoAtual,
  posicaoProjetada,
  totalDeEntes,
}: {
  atual: number;
  lacunas: number;
  total: number;
  escolhidos: number;
  onEscolher: (n: number) => void;
  posicaoAtual?: number;
  posicaoProjetada?: number;
  totalDeEntes?: number;
}) {
  const id = useId();
  if (!lacunas || !total) return null;

  const maximo = total > 0 ? Math.min(100, atual + (100 * lacunas) / 3 / total) : atual;
  const projetado = Math.min(100, atual + (100 * escolhidos) / 3 / total);

  const L = 300;
  const A = 96;
  const x = (n: number) => (n / lacunas) * L;
  const y = (v: number) => A - (v / Math.max(maximo, 1)) * (A - 12);

  return (
    <div>
      <svg
        viewBox={`0 0 ${L} ${A + 4}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Trajetória: com ${escolhidos} de ${lacunas} itens subindo um degrau, a pontuação vai de ${formatarPercentual(atual)} para ${formatarPercentual(projetado)}.`}
      >
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={`M0,${y(atual)} L${L},${y(maximo)} L${L},${A} L0,${A} Z`}
          fill={`url(#g-${id})`}
        />
        <line
          x1="0"
          y1={y(atual)}
          x2={L}
          y2={y(maximo)}
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {escolhidos > 0 && (
          <>
            <line
              x1={x(escolhidos)}
              y1={y(projetado)}
              x2={x(escolhidos)}
              y2={A}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <circle
              cx={x(escolhidos)}
              cy={y(projetado)}
              r="5"
              fill="var(--primary)"
              stroke="var(--card)"
              strokeWidth="2"
            />
          </>
        )}
        <circle cx="0" cy={y(atual)} r="3.5" fill="var(--muted-foreground)" />
      </svg>

      <label className="mt-1 block">
        <span className="sr-only">Quantos itens sobem um degrau</span>
        <input
          type="range"
          min={0}
          max={lacunas}
          value={escolhidos}
          onChange={(e) => onEscolher(Number(e.target.value))}
          className="h-11 w-full accent-[var(--primary)]"
        />
      </label>

      <p className="text-sm leading-relaxed">
        Se{" "}
        <strong className="tabular-nums">
          {escolhidos} de {lacunas}
        </strong>{" "}
        {escolhidos === 1 ? "item sair" : "itens saírem"} de “Sem progresso” para “Estágio
        inicial”, a pontuação vai de{" "}
        <strong className="tabular-nums">{formatarPercentual(atual)}</strong> para{" "}
        <strong className="tabular-nums text-[var(--sev-ok)]">
          {formatarPercentual(projetado)}
        </strong>
        {posicaoAtual != null && posicaoProjetada != null && totalDeEntes != null &&
          posicaoProjetada !== posicaoAtual && (
            <>
              {" "}
              e o ente passa da <strong>{posicaoAtual}ª</strong> para a{" "}
              <strong>{posicaoProjetada}ª</strong> posição entre {totalDeEntes}
            </>
          )}
        .
      </p>
    </div>
  );
}

/** Estado do controle da trajetória, para a rota não precisar saber do detalhe. */
export function useTrajetoria(lacunas: number) {
  const [escolhidos, setEscolhidos] = useState(() => Math.min(lacunas, Math.ceil(lacunas / 2)));
  return {
    escolhidos: Math.min(escolhidos, lacunas),
    escolher: setEscolhidos,
  };
}
