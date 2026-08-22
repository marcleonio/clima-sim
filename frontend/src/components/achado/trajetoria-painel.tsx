import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

import { TrajetoriaLinha } from "@/components/graficos/formas";
import { posicaoProjetada, projetar, type EnteParaTrajetoria } from "@/lib/trajetoria";

/**
 * O que acontece se o ente agir — no lugar do simulador.
 *
 * Nenhum parâmetro é estimado: a conta é a da escala oficial (quatro degraus,
 * 0 · 33 · 67 · 100%) e qualquer pessoa reproduz com a planilha na mão. Nada
 * aqui fala de dinheiro — o produto não tem dado para dizer quanto custa sair
 * de um degrau, e fingir que tem foi o erro removido junto com o simulador.
 *
 * O controle deslizante entrou na etapa E10. Antes, a projeção só espelhava a
 * seleção feita para montar a peça, o que respondia "e se eu agir nestes?" mas
 * não "e se eu agir em quantos?". Ele parte da seleção do usuário e volta a
 * segui-la sempre que ela muda — arrastar não desfaz o que ele escolheu na
 * lista, só explora a partir dali.
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
  /** Quantos itens estão marcados. Zero significa "todos". */
  selecionados: number;
  taxasDosOutros: number[];
}) {
  const partida = selecionados > 0 ? selecionados : ente.lac;
  const [movidos, setMovidos] = useState(partida);

  // A seleção da lista continua mandando: mexer nela reposiciona o controle.
  useEffect(() => setMovidos(partida), [partida]);

  const { trajetoria, posicao } = useMemo(() => {
    const t = projetar(ente, movidos, 1);
    return { trajetoria: t, posicao: posicaoProjetada(ente, t, taxasDosOutros, rank) };
  }, [ente, movidos, taxasDosOutros, rank]);

  if (ente.lac === 0) return null;

  return (
    <section aria-labelledby="trajetoria" className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 id="trajetoria" className="flex items-center gap-2 text-base font-bold">
        <TrendingUp className="size-4 text-primary" aria-hidden />
        Trajetória de regularização
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Arraste para ver quantos itens fazem diferença em {nomeEnte}.
      </p>

      <div className="mt-3">
        <TrajetoriaLinha
          atual={trajetoria.atual}
          lacunas={ente.lac}
          total={ente.tot}
          escolhidos={movidos}
          onEscolher={setMovidos}
          posicaoAtual={posicao.atual}
          posicaoProjetada={posicao.projetada}
          totalDeEntes={posicao.total}
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-4 border-t pt-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Ganho</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[var(--sev-ok)]">
            +{trajetoria.ganho.toFixed(1).replace(".", ",")} p.p.
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ainda sem progresso</dt>
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
        A reta é o argumento: como a pontuação é a média das notas dos itens, cada item
        regularizado vale exatamente o mesmo — não há atalho nem rendimento decrescente. Aritmética
        da escala oficial, não previsão, e sem nenhuma estimativa de custo.
      </p>
    </section>
  );
}
