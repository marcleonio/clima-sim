import { cn } from "@/lib/utils";
import { mapaComponentes, type CelulaComponente, type Ente, type MediaNacional } from "@/lib/achados";

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

/** Quantos degraus a rampa tem. Índice 0 = sem déficit; 5 = déficit máximo. */
const DEGRAUS = 6;

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

function Celula({ celula }: { celula: CelulaComponente }) {
  const { nome, c, maturidade, delta, lacunas, total } = celula;
  const acima = delta > 0;
  const degrau = degrauDeficit(maturidade);

  // A tinta do degrau vale para tudo dentro da célula. A hierarquia entre o
  // número e os rótulos se faz por tamanho e peso, não por opacidade — baixar a
  // opacidade sobre os degraus escuros derrubaria o contraste abaixo de AA.
  const estilo = {
    background: `var(--calor-${degrau})`,
    color: `var(--calor-${degrau}-tinta)`,
    borderColor: `color-mix(in oklch, var(--calor-${degrau}) 72%, var(--foreground) 12%)`,
  } as React.CSSProperties;

  return (
    <li
      className="group relative overflow-hidden rounded-lg border p-3 pb-4 transition-shadow hover:z-10 hover:shadow-md"
      style={estilo}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-xs font-bold tracking-wide">{c}</span>
        <span className="text-lg font-bold leading-none tabular-nums">{Math.round(maturidade)}</span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{nome}</p>

      <p className="mt-2 flex items-center gap-1 text-xs">
        <span className="font-bold">
          {acima ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}
        </span>
        <span className="opacity-80">vs país</span>
      </p>

      {lacunas > 0 && (
        <p className="mt-1 text-xs font-bold">
          {lacunas}/{total} sem progresso
        </p>
      )}

      {/* barra de valor: reforça a severidade por posição/forma, não só por matiz */}
      <div
        className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10 dark:bg-white/10"
        role="img"
        aria-label={`Maturidade ${Math.round(maturidade)} de 100`}
      >
        <div
          className="h-full transition-[width]"
          style={{ width: `${maturidade}%`, background: "currentColor" }}
        />
      </div>
    </li>
  );
}

export function ComponenteHeatmap({
  ente,
  nomes,
  nacional,
}: {
  ente: Ente;
  nomes: Record<string, string>;
  nacional: Record<string, MediaNacional>;
}) {
  const celulas = mapaComponentes(ente, nomes, nacional);
  if (!celulas.length) return null;

  return (
    <section aria-labelledby="mapa-componentes" className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="mapa-componentes" className="text-base font-bold">
            Mapa de maturidade
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Os 15 componentes oficiais, do mais frágil ao mais maduro. Quanto mais escuro, maior a
            lacuna.
          </p>
        </div>

        {/* legenda da escala — degraus discretos, não gradiente */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>menos lacuna</span>
          <span className="flex overflow-hidden rounded-sm" aria-hidden>
            {Array.from({ length: DEGRAUS }, (_, i) => (
              <span
                key={i}
                className="block size-3.5"
                style={{ background: `var(--calor-${i})` }}
              />
            ))}
          </span>
          <span>mais</span>
        </div>
      </div>

      <ul className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5")}>
        {celulas.map((c) => (
          <Celula key={c.c} celula={c} />
        ))}
      </ul>
    </section>
  );
}
