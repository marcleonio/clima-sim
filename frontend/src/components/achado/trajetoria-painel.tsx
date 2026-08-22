import { useMemo } from "react";
import { TrendingUp } from "lucide-react";

import {
  descreverTrajetoria,
  posicaoProjetada,
  projetar,
  type EnteParaTrajetoria,
} from "@/lib/trajetoria";

/**
 * O que acontece se o ente agir — no lugar do simulador.
 *
 * Não há nada para arrastar e nenhum parâmetro a estimar: a projeção é
 * consequência direta da seleção de achados que o usuário já faz para montar a
 * peça. Mesma ação, informação a mais.
 *
 * A conta é a da escala oficial (quatro degraus, 0 · 1/3 · 2/3 · 1) e qualquer
 * pessoa reproduz com a planilha na mão. Nada aqui fala de dinheiro: o produto
 * não tem dado para dizer quanto custa sair de um degrau.
 */
export function TrajetoriaPainel({
  nomeEnte,
  ente,
  rank,
  selecionados,
  taxasDosOutros,
}: {
  nomeEnte: string;
  ente: EnteParaTrajetoria;
  rank: number;
  /** Quantos achados estão marcados. Zero significa "todos". */
  selecionados: number;
  taxasDosOutros: number[];
}) {
  const requisitos = selecionados > 0 ? selecionados : ente.lac;

  const { trajetoria, posicao, frase } = useMemo(() => {
    const t = projetar(ente, requisitos, 1);
    const p = posicaoProjetada(ente, t, taxasDosOutros, rank);
    return { trajetoria: t, posicao: p, frase: descreverTrajetoria(nomeEnte, t, p) };
  }, [ente, requisitos, taxasDosOutros, rank, nomeEnte]);

  if (ente.lac === 0) return null;

  const largura = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

  return (
    <section aria-labelledby="trajetoria" className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 id="trajetoria" className="flex items-center gap-2 text-base font-bold">
        <TrendingUp className="size-4 text-primary" aria-hidden />
        Trajetória de regularização
      </h2>

      <p className="mt-2 max-w-prose text-pretty text-sm leading-relaxed text-foreground/85">
        {frase}
      </p>

      {/* a barra mostra o movimento, não um cenário inventado */}
      <div className="mt-4">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 bg-primary/35"
            style={{ width: largura(trajetoria.projetado) }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: largura(trajetoria.atual) }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            Índice hoje{" "}
            <strong className="font-semibold tabular-nums text-foreground">
              {trajetoria.atual.toFixed(1).replace(".", ",")}%
            </strong>
          </span>
          <span className="text-muted-foreground">
            Projetado{" "}
            <strong className="font-semibold tabular-nums text-primary">
              {trajetoria.projetado.toFixed(1).replace(".", ",")}%
            </strong>{" "}
            <span className="tabular-nums">
              (+{trajetoria.ganho.toFixed(1).replace(".", ",")})
            </span>
          </span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-4 border-t pt-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Requisitos movidos</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{trajetoria.requisitos}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Lacunas restantes</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{trajetoria.lacunasRestantes}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Posição projetada</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">
            {posicao.projetada}ª{" "}
            <span className="font-normal text-muted-foreground">de {posicao.total}</span>
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Aritmética da escala oficial da metodologia — quatro degraus por requisito, índice igual à
        média. Não é previsão nem modelo estatístico, e não estima custo.
      </p>
    </section>
  );
}
