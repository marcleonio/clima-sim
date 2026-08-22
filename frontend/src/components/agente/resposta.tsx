import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A resposta do agente, formatada.
 *
 * O modelo responde em markdown — títulos de bloco em negrito, listas, códigos
 * de requisito. O balão mostrava isso cru, com os asteriscos à vista: a
 * estrutura que a resposta tem por instrução (EVIDÊNCIA · HIPÓTESE · COMO
 * VERIFICAR · O QUE NÃO PROVA) chegava como sopa de pontuação.
 *
 * SEM BIBLIOTECA E SEM innerHTML
 *
 * Isto monta elementos React a partir do texto, e essa escolha é de segurança,
 * não de peso. Texto de modelo é entrada não confiável; passá-lo por
 * `dangerouslySetInnerHTML` — mesmo "sanitizado" — abre uma superfície que não
 * precisa existir. Montando nós, não há caminho para HTML injetado: o que não
 * for reconhecido vira texto literal.
 *
 * O subconjunto é o que o agente de fato usa: **negrito**, `código`, listas com
 * - ou número, e parágrafos. Nada de link, imagem ou HTML embutido.
 */

/** Os rótulos da estrutura de investigação, que ganham destaque próprio. */
const BLOCOS = ["EVIDÊNCIA", "HIPÓTESE", "COMO VERIFICAR", "O QUE ISSO NÃO PROVA", "O QUE NÃO PROVA"];

const TOM_DO_BLOCO: Record<string, string> = {
  "EVIDÊNCIA": "text-[var(--sev-ok)]",
  "HIPÓTESE": "text-[var(--sev-atencao)]",
  "COMO VERIFICAR": "text-[var(--eixo-gov)]",
  "O QUE ISSO NÃO PROVA": "text-[var(--sev-critico)]",
  "O QUE NÃO PROVA": "text-[var(--sev-critico)]",
};

/** Negrito e código dentro de uma linha. O resto vira texto literal. */
function inline(texto: string, chave: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const padrao = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let ultimo = 0;
  let i = 0;

  for (const achado of texto.matchAll(padrao)) {
    const inicio = achado.index ?? 0;
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio));

    const bruto = achado[0];
    if (bruto.startsWith("**")) {
      partes.push(
        <strong key={`${chave}-n${i}`} className="font-semibold text-foreground">
          {bruto.slice(2, -2)}
        </strong>,
      );
    } else {
      partes.push(
        <code
          key={`${chave}-c${i}`}
          className="rounded bg-muted px-1 py-px font-mono text-xs text-foreground"
        >
          {bruto.slice(1, -1)}
        </code>,
      );
    }

    ultimo = inicio + bruto.length;
    i += 1;
  }

  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/** Uma linha que abre bloco: "**EVIDÊNCIA** — ..." ou "EVIDÊNCIA — ...". */
function blocoDe(linha: string): { rotulo: string; resto: string } | null {
  const limpa = linha.replace(/\*\*/g, "").trim();
  for (const rotulo of BLOCOS) {
    if (limpa.toUpperCase().startsWith(rotulo)) {
      return { rotulo, resto: limpa.slice(rotulo.length).replace(/^\s*[—–-]\s*/, "") };
    }
  }
  return null;
}

export function RespostaFormatada({ texto }: { texto: string }) {
  const linhas = texto.split(/\r?\n/);
  const saida: ReactNode[] = [];

  let lista: { tipo: "ul" | "ol"; itens: string[] } | null = null;

  const fecharLista = (chave: string) => {
    if (!lista) return;
    const Tag = lista.tipo;
    saida.push(
      <Tag
        key={`l-${chave}`}
        className={cn(
          "my-1.5 space-y-1 pl-4 text-sm leading-relaxed",
          lista.tipo === "ul" ? "list-disc" : "list-decimal",
        )}
      >
        {lista.itens.map((item, i) => (
          <li key={i}>{inline(item, `${chave}-${i}`)}</li>
        ))}
      </Tag>,
    );
    lista = null;
  };

  linhas.forEach((linha, i) => {
    const chave = String(i);
    const cru = linha.trim();

    if (!cru) {
      fecharLista(chave);
      return;
    }

    const marcador = cru.match(/^[-*•]\s+(.*)$/);
    const numerado = cru.match(/^(\d+)[.)]\s+(.*)$/);

    if (marcador) {
      if (lista?.tipo !== "ul") fecharLista(chave);
      lista ??= { tipo: "ul", itens: [] };
      lista.itens.push(marcador[1]!);
      return;
    }

    if (numerado) {
      if (lista?.tipo !== "ol") fecharLista(chave);
      lista ??= { tipo: "ol", itens: [] };
      lista.itens.push(numerado[2]!);
      return;
    }

    fecharLista(chave);

    const bloco = blocoDe(cru);
    if (bloco) {
      saida.push(
        <p key={`b-${chave}`} className="mt-2.5 first:mt-0">
          <span
            className={cn(
              "mr-1.5 font-mono text-xs font-bold uppercase tracking-wider",
              TOM_DO_BLOCO[bloco.rotulo] ?? "text-muted-foreground",
            )}
          >
            {bloco.rotulo}
          </span>
          <span className="text-sm leading-relaxed">{inline(bloco.resto, chave)}</span>
        </p>,
      );
      return;
    }

    saida.push(
      <p key={`p-${chave}`} className="mt-1.5 text-sm leading-relaxed first:mt-0">
        {inline(cru, chave)}
      </p>,
    );
  });

  fecharLista("fim");

  return <div className="min-w-0">{saida.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</div>;
}
