import { PerfilDivergente } from "@/components/graficos/formas";
import { TiraPontuacao } from "@/components/graficos/legenda-pontuacao";
import { cn } from "@/lib/utils";
import {
  amplitudeComponentes,
  mapaComponentes,
  type CelulaComponente,
  type Ente,
  type MediaNacional,
} from "@/lib/achados";

/**
 * Mapa de calor dos 15 componentes da metodologia oficial.
 *
 * Responde de relance a pergunta que a lista de achados não responde:
 * "onde este ente está bem e onde está mal, comparado ao resto do país?".
 * Ordenado do pior para o melhor — o olho cai no problema primeiro.
 *
 * A escala mede DÉFICIT, não maturidade: o degrau mais escuro é o pior
 * problema. A rampa anterior prendia a luminância em .96 e variava só o matiz
 * num eixo vermelho→verde, o que dava 0,036 de amplitude de luminância na faixa
 * inteira — os 15 componentes saíam com a mesma cor em escala de cinza, na
 * impressão e sob deuteranopia. Os degraus vivem em `styles.css` (--calor-N)
 * porque precisam de valores próprios no tema escuro.
 *
 * A cor nunca trabalha sozinha: cada célula também traz o número e uma barra de
 * valor, para que a severidade continue legível sem depender do canal de cor.
 */

/**
 * Abaixo desta amplitude entre o melhor e o pior componente, a grade não tem
 * calor para mostrar: os 15 cartões dizem todos a mesma coisa. Aí a lista
 * compacta informa igual ocupando um quinto do espaço.
 */
const AMPLITUDE_MINIMA_PARA_GRADE = 12;

/**
 * Corta a maturidade (0–100) em um dos 6 degraus de déficit.
 *
 * Zero tem degrau próprio de propósito: `m === 0` significa que TODOS os
 * requisitos do componente foram avaliados como "Sem progresso" — é a condição
 * que o produto existe para encontrar, e é categoricamente diferente de "pouca
 * ação" (m = 11,1). Nas 733 células da base, 102 valem exatamente zero.
 *
 * Os demais cortes caem entre os valores canônicos da escala oficial
 * (0 · 11,1 · 22,2 · 33,3 · 44,4 · 50 · 55,6 · 58,3 · 66,7 · 77,8 · 83,3 ·
 * 88,9 · 100), para que nenhum valor real fique em cima de uma fronteira.
 * Distribuição resultante: 12% · 22% · 13% · 21% · 18% · 14%.
 */
export function degrauDeficit(maturidade: number): number {
  const m = Math.max(0, Math.min(100, maturidade));
  if (m <= 0) return 5;
  if (m < 33) return 4;
  if (m < 50) return 3;
  if (m < 66) return 2;
  if (m < 84) return 1;
  return 0;
}

function estiloDoDegrau(degrau: number): React.CSSProperties {
  // A tinta do degrau vale para tudo dentro da célula. A hierarquia entre o
  // número e os rótulos se faz por tamanho e peso, não por opacidade — baixar a
  // opacidade sobre os degraus escuros derrubaria o contraste abaixo de AA.
  return {
    background: `var(--calor-${degrau})`,
    color: `var(--calor-${degrau}-tinta)`,
    borderColor: `color-mix(in oklch, var(--calor-${degrau}) 72%, var(--foreground) 12%)`,
  };
}

function Celula({
  celula,
  selecionado,
  onSelecionar,
}: {
  celula: CelulaComponente;
  selecionado: boolean;
  onSelecionar: (() => void) | undefined;
}) {
  const { nome, c, maturidade, delta, lacunas, total } = celula;
  const acima = delta > 0;
  const degrau = degrauDeficit(maturidade);

  const miolo = (
    <>
      <span className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-xs font-bold tracking-wide">{c}</span>
        <span className="text-lg font-bold leading-none tabular-nums">
          {Math.round(maturidade)}
          <span className="text-xs font-semibold opacity-70">%</span>
        </span>
      </span>

      <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-tight">{nome}</span>

      <span className="mt-2 flex items-center gap-1 text-xs">
        <span className="font-bold">
          {acima ? "▲" : "▼"} {Math.abs(delta).toFixed(0)} p.p.
        </span>
        <span className="opacity-80">vs país</span>
      </span>

      {lacunas > 0 && (
        <span className="mt-1 block text-xs font-bold">
          {lacunas}/{total} sem progresso
        </span>
      )}

      {/* barra de valor: reforça a severidade por posição/forma, não só por matiz */}
      <span
        className="absolute inset-x-0 bottom-0 block h-1.5 bg-black/10 dark:bg-white/10"
        role="img"
        aria-label={`Pontuação ${Math.round(maturidade)}%`}
      >
        <span
          className="block h-full transition-[width]"
          style={{ width: `${maturidade}%`, background: "currentColor" }}
        />
      </span>
    </>
  );

  const classe = cn(
    "group relative block w-full overflow-hidden rounded-lg border p-3 pb-4 text-left",
    selecionado && "ring-2 ring-offset-2 ring-offset-card ring-foreground",
  );

  /*
   * Sem ação, não finge ser clicável.
   *
   * Antes, as 15 células eram sempre botões — mas um componente sem lacuna não
   * tem o que filtrar, e clicar nele produzia "0 requisitos, 0 itens sem
   * progresso". No Rio Grande do Sul isso acontecia em 13 das 15 células: 87%
   * dos cliques levavam a uma lista vazia.
   *
   * A grade continua mostrando os 15 — como MAPA DE MATURIDADE, os componentes
   * bons são informação. O que muda é que só os que têm lacuna carregam a
   * função de FILTRO.
   */
  if (!onSelecionar) {
    return (
      <li className={classe} style={estiloDoDegrau(degrau)}>
        {miolo}
      </li>
    );
  }

  return (
    <li className="contents">
      <button
        type="button"
        onClick={onSelecionar}
        aria-pressed={selecionado}
        className={cn(
          classe,
          "cursor-pointer transition-shadow hover:z-10 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        )}
        style={estiloDoDegrau(degrau)}
      >
        <span className="sr-only">
          {selecionado ? "Remover filtro de" : "Filtrar os itens por"} {nome}.{" "}
        </span>
        {miolo}
      </button>
    </li>
  );
}

export function ComponenteHeatmap({
  ente,
  nomes,
  nacional,
  filtro = null,
  onFiltrar,
}: {
  ente: Ente;
  nomes: Record<string, string>;
  nacional: Record<string, MediaNacional>;
  /** Componente atualmente usado como filtro da lista de achados. */
  filtro?: string | null;
  /** Quando ausente, as células não são interativas e não fingem ser. */
  onFiltrar?: (componente: string | null) => void;
}) {
  const celulas = mapaComponentes(ente, nomes, nacional);
  if (!celulas.length) return null;

  const amplitude = amplitudeComponentes(ente.comps);
  const usarGrade = amplitude >= AMPLITUDE_MINIMA_PARA_GRADE;

  /** Só estes têm o que filtrar — os outros levariam a uma lista vazia. */
  const comFiltro = celulas.filter((c) => c.lacunas > 0);

  const selecionar = onFiltrar
    ? (c: string) => onFiltrar(filtro === c ? null : c)
    : undefined;

  return (
    <section aria-labelledby="mapa-componentes" className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id="mapa-componentes" className="text-base font-bold">
            Pontuação por componente
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {usarGrade
              ? "Os 15 componentes oficiais, da menor para a maior pontuação. Quanto mais escuro, menor a pontuação."
              : "Os 15 componentes variam pouco entre si neste ente — a lista diz o mesmo que a grade."}
            {selecionar && comFiltro.length > 0 && " Só os componentes com item sem progresso são filtráveis."}
          </p>
        </div>

        {/* cada cor amarrada à faixa que representa, com os rótulos do manual */}
        <TiraPontuacao />
      </div>

      {/*
        O filtro de verdade: apenas os componentes com achado. Fica acima da
        grade porque é ele que responde "o que dá para filtrar aqui".
      */}
      {selecionar && comFiltro.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b pb-3">
          <span className="text-xs text-muted-foreground">Filtrar por:</span>
          {comFiltro.map((c) => (
            <button
              key={c.c}
              type="button"
              onClick={() => selecionar(c.c)}
              aria-pressed={filtro === c.c}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                filtro === c.c
                  ? "border-foreground bg-foreground text-background"
                  : "hover:border-primary hover:bg-accent/50",
              )}
            >
              <span className="font-mono">{c.c}</span>
              <span className="max-w-32 truncate font-normal">{c.nome}</span>
              <span className="tabular-nums opacity-70">{c.lacunas}</span>
            </button>
          ))}
          {filtro && (
            <button
              type="button"
              onClick={() => onFiltrar?.(null)}
              className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold text-primary hover:bg-accent"
            >
              Ver todos
            </button>
          )}
        </div>
      )}

      {/*
        Quando a variação entre componentes é pequena, quinze cartões dizem
        todos a mesma coisa. O perfil divergente resolve isso mostrando a
        DISTÂNCIA para o país em vez do valor absoluto: o eixo zero faz o
        trabalho que quinze textos "▲ 8 vs país" faziam, e o que sobra na tela
        é a forma da fragilidade do ente.
      */}
      {!usarGrade ? (
        <PerfilDivergente
          itens={celulas.map((c) => ({
            c: c.c,
            nome: c.nome,
            delta: c.delta,
            maturidade: c.maturidade,
            lacunas: c.lacunas,
          }))}
          selecionado={filtro ?? null}
          {...(selecionar ? { onSelecionar: selecionar } : {})}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {celulas.map((c) => (
            <Celula
              key={c.c}
              celula={c}
              selecionado={filtro === c.c}
              onSelecionar={selecionar && c.lacunas > 0 ? () => selecionar(c.c) : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
