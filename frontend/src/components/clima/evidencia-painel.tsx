import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react";

import type { EvidenciaItem } from "@/lib/clima-api";

// Pior nota primeiro: é a pergunta que a pessoa realmente tem ("por que essa nota é baixa?").
const ORDEM_NOTA: Record<string, number> = {
  "Sem progresso": 0,
  "Estágio inicial": 1,
  "Estágio intermediário": 2,
  "Estágio avançado": 3,
};

const LIMITE_PREVIA = 280;

function EvidenciaLinha({ item }: { item: EvidenciaItem }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const longo = item.comentario.length > LIMITE_PREVIA;
  const texto = aberto || !longo ? item.comentario : `${item.comentario.slice(0, LIMITE_PREVIA)}…`;

  const copiar = async () => {
    const data = item.dataAvaliacao ? item.dataAvaliacao.slice(0, 10) : "data não informada";
    const citacao = `${item.componente}.${item.item} (${item.notaTexto}, avaliado em ${data}) — Painel ClimaBrasil:\n"${item.comentario}"`;
    try {
      await navigator.clipboard.writeText(citacao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) - falha silenciosa, sem quebrar a tela.
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {item.componente}.{item.item} · {item.notaTexto}
        </span>
        <button
          type="button"
          onClick={() => void copiar()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copiado ? "Copiado" : "Copiar citação"}
        </button>
      </div>
      <p className="mt-1.5 whitespace-pre-line leading-relaxed text-muted-foreground">{texto}</p>
      {longo && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          {aberto ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {aberto ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

export function EvidenciaPainel({
  itens,
  carregando,
}: {
  itens: EvidenciaItem[];
  carregando: boolean;
}) {
  if (carregando) {
    return <p className="text-xs text-muted-foreground">Carregando evidências…</p>;
  }
  if (!itens.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhum comentário de auditor registrado para este eixo nesta entidade.
      </p>
    );
  }

  const ordenados = [...itens].sort(
    (a, b) => (ORDEM_NOTA[a.notaTexto] ?? 99) - (ORDEM_NOTA[b.notaTexto] ?? 99),
  );

  return (
    <div className="space-y-2">
      {ordenados.map((item, i) => (
        <EvidenciaLinha key={`${item.componente}-${item.item}-${i}`} item={item} />
      ))}
    </div>
  );
}
