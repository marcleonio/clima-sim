import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { CRITERIOS, type Criterio, type Prioridade } from "@/lib/prioridade";

/**
 * A lista de ação: onde atuar primeiro, e por quê.
 *
 * A barra ao lado de cada linha não é decoração — é a decomposição do índice.
 * Um órgão de controle não aceita uma prioridade que não sabe explicar, então
 * cada critério aparece com a fatia que contribuiu.
 *
 * A forma mudou na etapa E8. Antes eram doze cartões empilhados, cada um com
 * nome, tipo, IPA, componente, contagem e barra — ocupando a tela inteira para
 * comunicar o que cabia numa frase, já que as doze primeiras posições eram do
 * mesmo componente. Agora a manchete vem primeiro e a lista é uma linha por
 * item, com o detalhe aparecendo só no item sob o cursor.
 */

/** Uma cor por critério, fixa. Não é escala: é identidade de categoria. */
const COR: Record<Criterio, string> = {
  deficit: "var(--calor-4)",
  exposicao: "var(--eixo-gov)",
  normativo: "var(--eixo-fin)",
  alavancagem: "var(--eixo-pol)",
  precedente: "var(--muted-foreground)",
};

function BarraDecomposta({ prioridade, alta }: { prioridade: Prioridade; alta: boolean }) {
  const { contribuicoes, ipa } = prioridade;

  return (
    <span
      className={cn(
        "flex w-full overflow-hidden rounded-sm bg-muted transition-[height] duration-200",
        alta ? "h-2.5" : "h-1.5",
      )}
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
          <span key={id} className="block h-full" style={{ width: `${fatia}%`, background: COR[id] }} />
        );
      })}
    </span>
  );
}

export function LegendaCriterios() {
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs">
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

/**
 * A frase que a lista está dizendo.
 *
 * Quando um único componente domina o topo, isso É o achado — e cabe numa
 * linha, em vez de o leitor ter que perceber lendo doze cartões.
 */
function manchete(prioridades: Prioridade[]): string | null {
  if (prioridades.length < 3) return null;

  const contagem = new Map<string, number>();
  for (const p of prioridades) contagem.set(p.componente, (contagem.get(p.componente) ?? 0) + 1);

  const [codigo, quantos] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]!;
  if (quantos / prioridades.length < 0.5) return null;

  const nome = prioridades.find((p) => p.componente === codigo)?.nomeComponente ?? codigo;
  return `${quantos} das ${prioridades.length} primeiras posições são ${codigo} — ${nome}.`;
}

export function ListaAcao({
  prioridades,
  perfilLegivel,
  realcado,
  onRealcar,
}: {
  prioridades: Prioridade[];
  /** Descrição dos pesos usados — vai junto para a peça poder citar. */
  perfilLegivel: string;
  /** Ente sob o cursor em qualquer outro componente da tela. */
  realcado?: string | null;
  onRealcar?: (nome: string | null) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (!prioridades.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum componente com lacuna neste recorte.
      </p>
    );
  }

  const frase = manchete(prioridades);

  return (
    <div className="space-y-3">
      {frase && (
        <p className="rounded-lg border border-[var(--sev-critico)]/40 bg-[var(--sev-critico-bg)] px-3 py-2 text-sm font-semibold">
          {frase}
        </p>
      )}

      <ol className="divide-y rounded-xl border bg-card">
        {prioridades.map((p, i) => {
          const chave = `${p.ente}/${p.componente}`;
          const alta = aberto === chave;

          return (
            <li
              key={chave}
              onMouseEnter={() => {
                setAberto(chave);
                onRealcar?.(p.ente);
              }}
              onMouseLeave={() => {
                setAberto((atual) => (atual === chave ? null : atual));
                onRealcar?.(null);
              }}
              className={cn(
                "transition-colors duration-150",
                alta && "bg-accent/40",
                // realce vindo de outro componente: o mesmo ente acende aqui
                !alta && realcado === p.ente && "bg-accent/25",
              )}
            >
              <div className="flex items-center gap-2.5 px-3 py-2">
                <span className="w-5 flex-none text-right font-mono text-xs font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold">{p.ente}</span>
                    <span className="flex-none font-mono text-xs font-bold text-muted-foreground">
                      {p.componente}
                    </span>
                    <span className="flex-none text-xs font-semibold text-[var(--sev-critico)] tabular-nums">
                      {p.lacunas}/{p.total}
                    </span>
                  </span>
                  <span className="mt-1 block">
                    <BarraDecomposta prioridade={p} alta={alta} />
                  </span>
                </span>

                <span className="flex-none font-mono text-xs tabular-nums text-muted-foreground">
                  {p.ipa.toFixed(3).replace(".", ",")}
                </span>

                <Link
                  to="/achados"
                  search={{ ente: p.ente, comp: p.componente }}
                  className="grid size-11 flex-none place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Abrir o dossiê de ${p.ente} no componente ${p.componente}`}
                >
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>

              {/* o detalhe só aparece no item sob o cursor */}
              {alta && (
                <p className="px-3 pb-2 pl-10 text-xs text-muted-foreground">
                  {p.tipo} · {p.nomeComponente} ·{" "}
                  {CRITERIOS.map(
                    ({ id, nome }) =>
                      `${nome} ${((p.contribuicoes[id] / (p.ipa || 1)) * 100).toFixed(0)}%`,
                  ).join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Índice de prioridade de atuação por soma ponderada, decomponível por construção. Pesos deste
        recorte: {perfilLegivel}. Os pesos são escolha de política, não descoberta empírica — e devem
        ser citados junto com qualquer número tirado daqui.
      </p>
    </div>
  );
}
