import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { CRITERIOS, type Criterio, type Prioridade } from "@/lib/prioridade";

/**
 * A lista de ação: onde atuar primeiro, e por quê.
 *
 * A barra empilhada ao lado de cada linha não é decoração — é a decomposição do
 * índice. Um órgão de controle não aceita uma prioridade que não sabe explicar,
 * então cada critério aparece com a fatia que ele contribuiu. Passe o mouse e o
 * valor bruto aparece; a tabela abaixo dá o mesmo em texto.
 */

/** Uma cor por critério, fixa. Não é escala: é identidade de categoria. */
const COR: Record<Criterio, string> = {
  deficit: "var(--calor-4)",
  exposicao: "var(--eixo-gov)",
  normativo: "var(--eixo-fin)",
  alavancagem: "var(--eixo-pol)",
  precedente: "var(--muted-foreground)",
};

function BarraDecomposta({ prioridade }: { prioridade: Prioridade }) {
  const { contribuicoes, ipa } = prioridade;

  return (
    <span
      className="flex h-2.5 w-full overflow-hidden rounded-sm bg-muted"
      role="img"
      aria-label={CRITERIOS.map(
        ({ id, nome }) =>
          `${nome} contribui ${((contribuicoes[id] / (ipa || 1)) * 100).toFixed(0)}%`,
      ).join("; ")}
    >
      {CRITERIOS.map(({ id }) => {
        const fatia = ipa > 0 ? (contribuicoes[id] / ipa) * 100 : 0;
        if (fatia <= 0) return null;
        return (
          <span
            key={id}
            className="block h-full"
            style={{ width: `${fatia}%`, background: COR[id] }}
          />
        );
      })}
    </span>
  );
}

export function LegendaCriterios() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      {CRITERIOS.map(({ id, nome, explica }) => (
        <li key={id} className="flex items-center gap-1.5" title={explica}>
          <span
            className="block size-2.5 flex-none rounded-[2px]"
            style={{ background: COR[id] }}
            aria-hidden
          />
          <span className="text-muted-foreground">{nome}</span>
        </li>
      ))}
    </ul>
  );
}

export function ListaAcao({
  prioridades,
  perfilLegivel,
}: {
  prioridades: Prioridade[];
  /** Descrição dos pesos usados — vai junto para a peça poder citar. */
  perfilLegivel: string;
}) {
  if (!prioridades.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum componente com lacuna neste recorte.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {prioridades.map((p, i) => (
          <li
            key={`${p.ente}/${p.componente}`}
            className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 flex-none place-items-center rounded-md bg-muted font-mono text-xs font-bold tabular-nums">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="min-w-0 text-sm font-semibold">
                    {p.ente}
                    <span className="font-normal text-muted-foreground"> · {p.tipo}</span>
                  </p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    IPA {p.ipa.toFixed(3).replace(".", ",")}
                  </p>
                </div>

                <p className="mt-0.5 text-sm">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {p.componente}
                  </span>{" "}
                  {p.nomeComponente}
                  <span className="ml-1.5 font-semibold text-[var(--sev-critico)]">
                    {p.lacunas}/{p.total} sem progresso
                  </span>
                </p>

                <div className="mt-2">
                  <BarraDecomposta prioridade={p} />
                </div>
              </div>

              <Link
                to="/achados"
                search={{ ente: p.ente, comp: p.componente }}
                className={cn(
                  "grid size-11 flex-none place-items-center rounded-lg text-muted-foreground",
                  "hover:bg-accent hover:text-foreground",
                )}
                aria-label={`Abrir o dossiê de ${p.ente} no componente ${p.componente}`}
              >
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Índice de prioridade de atuação por soma ponderada, decomponível por construção. Pesos
        deste recorte: {perfilLegivel}. Os pesos são escolha de política, não descoberta empírica —
        e devem ser citados junto com qualquer número tirado daqui.
      </p>
    </div>
  );
}
