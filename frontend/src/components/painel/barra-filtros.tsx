import { RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A barra de filtros do painel, em uma linha.
 *
 * Antes eram cinco `<select>` lado a lado com rótulo em cima. Isso ocupava 120px
 * de altura, quebrava em duas linhas, e — o pior — escondia o estado: para saber
 * o que estava filtrado era preciso abrir cada caixa.
 *
 * Aqui os filtros são grupos de botões de alternância. Ocupam 44px, mantêm o
 * alvo de toque mínimo, e o estado fica visível sem abrir nada. Os recortes com
 * muitas opções (componente) continuam em `<select>`, porque quinze botões numa
 * linha seria pior que uma caixa.
 */

export interface Opcao {
  valor: string;
  texto: string;
  /** Rótulo curto para telas estreitas. */
  curto?: string;
}

function Grupo({
  rotulo,
  valor,
  opcoes,
  onMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  onMudar: (v: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:inline">
        {rotulo}
      </span>
      <div
        role="group"
        aria-label={rotulo}
        className="flex min-w-0 overflow-hidden rounded-lg border bg-background"
      >
        {opcoes.map((o) => {
          const ativo = valor === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => onMudar(o.valor)}
              aria-pressed={ativo}
              className={cn(
                "min-h-11 shrink-0 px-3 text-xs font-semibold transition-colors",
                "border-r last:border-r-0",
                ativo
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{o.curto ?? o.texto}</span>
              <span className="hidden sm:inline">{o.texto}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Caixa({
  rotulo,
  valor,
  opcoes,
  onMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  onMudar: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:inline">
        {rotulo}
      </span>
      <select
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        aria-label={rotulo}
        className="min-h-11 min-w-0 max-w-44 truncate rounded-lg border bg-background px-2.5 text-xs font-semibold"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Um filtro ativo, removível com um toque. Torna o estado visível. */
function Etiqueta({ texto, onRemover }: { texto: string; onRemover: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemover}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold hover:bg-accent/70"
    >
      {texto}
      <X className="size-3" aria-hidden />
      <span className="sr-only">Remover filtro</span>
    </button>
  );
}

export function BarraFiltros({
  grupos,
  caixas,
  ativos,
  onLimpar,
  nota,
}: {
  grupos: { rotulo: string; valor: string; opcoes: Opcao[]; onMudar: (v: string) => void }[];
  caixas: { rotulo: string; valor: string; opcoes: Opcao[]; onMudar: (v: string) => void }[];
  /** Filtros aplicados, para o usuário ver e remover sem abrir nada. */
  ativos: { texto: string; onRemover: () => void }[];
  onLimpar: () => void;
  nota?: string;
}) {
  return (
    <section
      aria-label="Filtros"
      className="sticky top-16 z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {grupos.map((g) => (
          <Grupo key={g.rotulo} {...g} />
        ))}
        {caixas.map((c) => (
          <Caixa key={c.rotulo} {...c} />
        ))}

        {ativos.length > 0 && (
          <>
            <span className="hidden h-6 w-px bg-border sm:block" aria-hidden />
            {ativos.map((a) => (
              <Etiqueta key={a.texto} {...a} />
            ))}
            <button
              type="button"
              onClick={onLimpar}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden />
              Limpar
            </button>
          </>
        )}

        {nota && (
          <p className="ml-auto hidden text-xs text-muted-foreground lg:block">{nota}</p>
        )}
      </div>
    </section>
  );
}
