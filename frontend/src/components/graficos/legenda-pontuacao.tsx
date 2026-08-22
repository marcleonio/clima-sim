import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { cn } from "@/lib/utils";

/**
 * A legenda da rampa, amarrada à classificação oficial.
 *
 * Antes ela era um gradiente com "menos lacuna" de um lado e "mais" do outro —
 * o leitor via que escuro é pior, mas não sabia **o que** cada tom significa na
 * escala da metodologia. Cor sem vínculo textual não é informação, é decoração.
 *
 * Agora cada degrau declara a faixa de pontuação que representa e, quando a
 * faixa coincide com um rótulo do manual, o rótulo aparece:
 *
 *   "os componentes que tiverem pontuação igual ou inferior a 33% serão
 *    considerados DESAFIOS [...] os componentes com pontuação igual ou superior
 *    a 67% serão classificados como PONTOS FORTES"
 *      — Manual do Painel ClimaBrasil, p. 6
 *
 * O degrau mais escuro tem tratamento próprio: pontuação zero significa que
 * NENHUM item do componente teve ação demonstrada, e isso é categoricamente
 * diferente de "pouca ação".
 */

interface Degrau {
  passo: number;
  faixa: string;
  rotulo: string;
  explica: string;
  oficial?: "desafio" | "ponto-forte";
}

/** Os cortes são os de `degrauDeficit`, escritos aqui na linguagem do usuário. */
export const DEGRAUS_LEGENDA: Degrau[] = [
  {
    passo: 5,
    faixa: "0%",
    rotulo: "Sem progresso",
    explica: "Nenhum item do componente teve ação demonstrada.",
    oficial: "desafio",
  },
  {
    passo: 4,
    faixa: "1% a 32%",
    rotulo: "Desafio",
    explica: "Pouca ação demonstrada. O manual classifica esta faixa como desafio.",
    oficial: "desafio",
  },
  {
    passo: 3,
    faixa: "33% a 49%",
    rotulo: "Começou",
    explica: "A maioria dos itens está em estágio inicial.",
  },
  {
    passo: 2,
    faixa: "50% a 65%",
    rotulo: "A caminho",
    explica: "Entre o estágio inicial e o intermediário.",
  },
  {
    passo: 1,
    faixa: "66% a 83%",
    rotulo: "Ponto forte",
    explica: "A partir de 67% o manual classifica o componente como ponto forte.",
    oficial: "ponto-forte",
  },
  {
    passo: 0,
    faixa: "84% a 100%",
    rotulo: "Consolidado",
    explica: "A maioria dos itens em estágio avançado.",
    oficial: "ponto-forte",
  },
];

/**
 * Versão completa: uma linha por degrau, com faixa e explicação.
 * Para onde há espaço — painel lateral, peça impressa, ajuda.
 */
export function LegendaPontuacao({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ul className="space-y-1">
        {DEGRAUS_LEGENDA.map((d) => (
          <li key={d.passo} className="flex items-start gap-2 text-xs">
            <span
              className="mt-0.5 size-3.5 flex-none rounded-sm border"
              style={{
                background: `var(--calor-${d.passo})`,
                borderColor: `color-mix(in oklch, var(--calor-${d.passo}) 70%, var(--foreground) 14%)`,
              }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="font-semibold tabular-nums">{d.faixa}</span>
              <span className="mx-1.5 text-muted-foreground" aria-hidden>
                ·
              </span>
              <span className="font-semibold">{d.rotulo}</span>
              <span className="block text-muted-foreground">{d.explica}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        As faixas de <strong>desafio</strong> (até 33%) e <strong>ponto forte</strong> (67% ou
        mais) são do manual do Painel ClimaBrasil. Os cortes intermediários são de leitura,
        posicionados entre os valores da escala oficial.
      </p>
    </div>
  );
}

/**
 * Versão em tira: mesma informação, uma linha.
 * Para o cabeçalho de uma seção, onde a legenda completa não cabe.
 */
export function TiraPontuacao({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}>
      <span className="text-muted-foreground">Pontuação</span>
      {DEGRAUS_LEGENDA.map((d) => (
        <span key={d.passo} className="flex items-center gap-1" title={`${d.faixa} — ${d.explica}`}>
          <span
            className="size-3 flex-none rounded-[2px]"
            style={{ background: `var(--calor-${d.passo})` }}
            aria-hidden
          />
          <span className={cn("tabular-nums", d.oficial ? "font-semibold" : "text-muted-foreground")}>
            {d.passo === 5 ? "0%" : d.passo === 0 ? "100%" : d.faixa.split(" a ")[0]}
          </span>
        </span>
      ))}
      <span className="text-muted-foreground">
        · até 33% <strong className="font-semibold text-foreground">desafio</strong>, 67%+{" "}
        <strong className="font-semibold text-foreground">ponto forte</strong>
      </span>
    </div>
  );
}

/** O rótulo qualitativo de uma pontuação, para usar em texto corrido. */
export function rotuloDe(pontuacao: number): Degrau {
  const passo = degrauDeficit(pontuacao);
  return DEGRAUS_LEGENDA.find((d) => d.passo === passo) ?? DEGRAUS_LEGENDA[3]!;
}
