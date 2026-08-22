import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, Sparkles, X } from "lucide-react";

import { Mascote, type EstadoMascote } from "@/components/agente/mascote";
import { Button } from "@/components/ui/button";
import { PERGUNTAS_INICIAIS, type Insight } from "@/lib/agente/insights";
import { perguntarAoAgente } from "@/lib/agente/servidor";
import { cn } from "@/lib/utils";

/**
 * O assistente, como painel lateral acionado por um balão flutuante.
 *
 * Painel e não modal de propósito: o gestor precisa continuar vendo o dado
 * enquanto conversa, e o agente vai citar o que está na tela.
 *
 * As observações proativas que aparecem antes de qualquer pergunta são
 * CALCULADAS (ver lib/agente/insights.ts) — nenhuma chamada de API para
 * mostrá-las. Só a conversa livre sobe para o modelo.
 */

interface Mensagem {
  papel: "usuario" | "assistente";
  texto: string;
  ferramentas?: string[];
  indisponivel?: boolean;
}

const TOM: Record<Insight["tom"], string> = {
  critico: "border-[var(--sev-critico)]/40 bg-[var(--sev-critico-bg)]",
  atencao: "border-[var(--sev-atencao)]/40 bg-[var(--sev-atencao-bg)]",
  ok: "border-[var(--sev-ok)]/40 bg-[var(--sev-ok-bg)]",
  neutro: "border-border bg-muted/50",
};

export function BalaoAgente({
  contexto,
  insights = [],
}: {
  /** Uma frase dizendo o que está na tela — vai junto com a pergunta. */
  contexto?: string;
  insights?: Insight[];
}) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [pensando, setPensando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aberto) campo.current?.focus();
  }, [aberto]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, pensando]);

  // Esc fecha — todo painel sobreposto precisa de saída de teclado.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const enviar = useCallback(
    async (pergunta: string) => {
      const limpa = pergunta.trim();
      if (!limpa || pensando) return;

      const historico = mensagens.slice(-8).map((m) => ({ papel: m.papel, texto: m.texto }));
      setMensagens((atual) => [...atual, { papel: "usuario", texto: limpa }]);
      setRascunho("");
      setPensando(true);

      try {
        const resposta = await perguntarAoAgente({
          data: {
            pergunta: contexto ? `${contexto}\n\nPergunta: ${limpa}` : limpa,
            historico,
          },
        });
        setMensagens((atual) => [
          ...atual,
          {
            papel: "assistente",
            texto: resposta.texto,
            ferramentas: resposta.ferramentasUsadas,
            ...(resposta.indisponivel ? { indisponivel: true } : {}),
          },
        ]);
      } catch {
        setMensagens((atual) => [
          ...atual,
          {
            papel: "assistente",
            texto:
              "Não consegui falar com o assistente. As telas do painel continuam funcionando — " +
              "elas não dependem dele.",
            indisponivel: true,
          },
        ]);
      } finally {
        setPensando(false);
      }
    },
    [contexto, mensagens, pensando],
  );

  /**
   * O estado do mascote substitui texto de status: "consultando" é o anel
   * girando, não a frase. A ordem importa — pensar vence tudo, depois peça
   * pronta, depois observação crítica.
   */
  const estadoDoMascote: EstadoMascote = pensando
    ? "consultando"
    : mensagens.some((m) => m.papel === "assistente" && !m.indisponivel)
      ? "pronto"
      : insights.some((i) => i.tom === "critico")
        ? "achado"
        : "repouso";

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex min-h-14 items-center gap-2 rounded-full px-5",
          "bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label="Abrir o assistente do ClimaSim"
      >
        <Mascote estado={estadoDoMascote} tamanho={30} />
        <span className="text-sm font-semibold">Assistente</span>
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "fixed bottom-0 right-0 z-40 flex h-[min(38rem,90vh)] w-full flex-col",
        "border-l border-t bg-card shadow-2xl sm:bottom-4 sm:right-4 sm:w-[26rem] sm:rounded-xl sm:border",
      )}
      aria-label="Assistente do ClimaSim"
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Mascote estado={estadoDoMascote} tamanho={26} className="text-primary" />
          Assistente
        </p>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Fechar o assistente"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
        {/* observações calculadas — aparecem sem custo nenhum */}
        {mensagens.length === 0 && insights.length > 0 && (
          <section aria-label="Observações sobre esta tela" className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden />
              Nesta tela
            </p>
            {insights.map((insight, i) => (
              <div key={i} className={cn("rounded-lg border p-2.5", TOM[insight.tom])}>
                <p className="text-sm leading-relaxed">{insight.texto}</p>
                {insight.seguir && (
                  <button
                    type="button"
                    onClick={() => void enviar(insight.seguir!)}
                    className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    {insight.seguir}
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {mensagens.length === 0 && (
          <section aria-label="Perguntas sugeridas" className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ou pergunte
            </p>
            {PERGUNTAS_INICIAIS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void enviar(p)}
                className="block w-full rounded-lg border p-2.5 text-left text-sm hover:border-primary hover:bg-accent/50"
              >
                {p}
              </button>
            ))}
          </section>
        )}

        {mensagens.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.papel === "usuario"
                ? "ml-6 bg-primary text-primary-foreground"
                : "mr-2 border bg-background",
              m.indisponivel && "border-[var(--sev-atencao)]/50 bg-[var(--sev-atencao-bg)]",
            )}
          >
            <p className="whitespace-pre-wrap">{m.texto}</p>
            {m.ferramentas && m.ferramentas.length > 0 && (
              <p className="mt-2 border-t pt-1.5 font-mono text-[11px] text-muted-foreground">
                consultou: {m.ferramentas.join(", ")}
              </p>
            )}
          </div>
        ))}

        {pensando && (
          <p className="mr-2 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Mascote estado="consultando" tamanho={22} className="text-primary" />
            Consultando os dados…
          </p>
        )}

        <div ref={fim} />
      </div>

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(rascunho);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="pergunta-agente" className="sr-only">
            Pergunte sobre os dados
          </label>
          <textarea
            id="pergunta-agente"
            ref={campo}
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar(rascunho);
              }
            }}
            rows={2}
            placeholder="Pergunte sobre os dados…"
            className="min-h-11 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 flex-none"
            disabled={!rascunho.trim() || pensando}
            aria-label="Enviar pergunta"
          >
            <ArrowUp className="size-4" aria-hidden />
          </Button>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Responde apenas a partir dos dados do{" "}
          <Link to="/metodologia" className="underline">
            Painel ClimaBrasil
          </Link>
          . Confira sempre a peça antes de protocolar.
        </p>
      </form>
    </aside>
  );
}
