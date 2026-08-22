/**
 * Observações proativas sobre o que está na tela.
 *
 * Tudo aqui é CALCULADO, não gerado. Quando o gestor abre um ente, as duas ou
 * três frases que o balão mostra saem de aritmética sobre os dados locais —
 * nenhuma chamada de API, nenhuma latência, nenhum token, e nenhuma chance de
 * alucinação. O modelo, quando entra, redige; ele não descobre.
 *
 * Essa é a maior alavanca de economia do agente: a maior parte das perguntas
 * que um painel recebe é consulta, e consulta não precisa de modelo.
 */

import { formatarNumero, formatarPercentual, taxaLacuna, COMPONENTES_CRITICOS } from "@/lib/achados";
import { ENTES, META, type EnteResumo } from "@/lib/dados";
import { alavancagemDe } from "@/lib/prioridade";
import { regiaoDe } from "@/lib/territorio";

export interface Insight {
  /** Curto e afirmativo — é uma manchete, não um parágrafo. */
  texto: string;
  tom: "critico" | "atencao" | "neutro" | "ok";
  /** Pergunta que este insight sugere fazer em seguida. */
  seguir?: string;
}

/** Mediana simples — resistente aos extremos, ao contrário da média. */
function mediana(valores: number[]): number {
  if (!valores.length) return 0;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 ? ordenado[meio]! : (ordenado[meio - 1]! + ordenado[meio]!) / 2;
}

/**
 * O que vale a pena dizer sobre este ente antes que perguntem.
 *
 * Devolve no máximo três, ordenados por relevância — um painel que despeja dez
 * observações não está ajudando, está fazendo o usuário triar de novo.
 */
export function insightsDoEnte(nome: string, ente: EnteResumo): Insight[] {
  const achados: Insight[] = [];

  // 1. Risco de vida vem sempre primeiro, quando existe.
  const criticos = (COMPONENTES_CRITICOS as readonly string[])
    .map((c) => ({ c, resumo: ente.comps[c] }))
    .filter((x) => (x.resumo?.l ?? 0) > 0);

  if (criticos.length) {
    const nomes = criticos.map((x) => META.componentes[x.c] ?? x.c).join(" e ");
    achados.push({
      texto:
        `Há lacuna em ${nomes}` +
        (ente.pop ? `, em jurisdição com ${formatarNumero(ente.pop)} habitantes.` : "."),
      tom: "critico",
      seguir: `Quem já resolveu ${criticos[0]!.c} e o que fez?`,
    });
  }

  // 2. O "quase lá": onde já há movimento, o próximo degrau custa menos.
  const emMovimento = Object.entries(ente.comps)
    .map(([c, r]) => ({ c, r, alavancagem: alavancagemDe(r.d, r.t) }))
    .filter((x) => x.r.l > 0 && x.alavancagem > 0)
    .sort((a, b) => b.alavancagem - a.alavancagem);

  const melhor = emMovimento[0];
  if (melhor) {
    const parciais = (melhor.r.d[1] ?? 0) + (melhor.r.d[2] ?? 0);
    achados.push({
      texto:
        `Em ${META.componentes[melhor.c] ?? melhor.c}, ${parciais} de ${melhor.r.t} requisitos ` +
        `já saíram do zero — é onde o próximo degrau custa menos.`,
      tom: "ok",
      seguir: `O que já foi feito em ${melhor.c} neste ente?`,
    });
  }

  // 3. Como o ente se situa entre os pares do mesmo tipo e região.
  const regiao = regiaoDe(ente.id);
  const pares = Object.entries(ENTES).filter(
    ([n, e]) => n !== nome && e.tipo === ente.tipo && regiaoDe(e.id) === regiao,
  );

  if (pares.length >= 3 && regiao) {
    const medianaPares = mediana(pares.map(([, e]) => e.mat));
    const distancia = ente.mat - medianaPares;
    const acima = distancia >= 0;

    achados.push({
      texto:
        `Entre ${ente.tipo === "Estado" ? "os estados" : "as capitais"} do ${regiao}, está ` +
        `${formatarPercentual(Math.abs(distancia))} ${acima ? "acima" : "abaixo"} da mediana ` +
        `(${formatarPercentual(medianaPares)}).`,
      tom: acima ? "ok" : "atencao",
      seguir: `Compare este ente com os outros do ${regiao}.`,
    });
  }

  // 4. Só se ainda houver espaço: o retrato geral.
  if (achados.length < 3) {
    const taxa = taxaLacuna(ente);
    achados.push({
      texto:
        ente.lac === 0
          ? "Nenhum requisito sem ação demonstrada nesta safra de avaliação."
          : `${formatarPercentual(taxa, 0)} dos requisitos sem ação demonstrada — ` +
            `${ente.rank}ª posição em fragilidade entre ${META.total}.`,
      tom: ente.lac === 0 ? "ok" : taxa >= 45 ? "critico" : "atencao",
    });
  }

  return achados.slice(0, 3);
}

/** Observações sobre o recorte do painel nacional. */
export function insightsDoRecorte(selecionados: [string, EnteResumo][]): Insight[] {
  if (!selecionados.length) return [];

  const semLacuna = selecionados.filter(([, e]) => e.lac === 0);
  const piores = [...selecionados].sort(
    (a, b) => taxaLacuna(b[1]) - taxaLacuna(a[1]),
  );

  const insights: Insight[] = [];

  const pior = piores[0];
  if (pior && pior[1].lac > 0) {
    insights.push({
      texto:
        `${pior[0]} é o mais frágil deste recorte: ${pior[1].lac} de ${pior[1].tot} requisitos ` +
        `sem ação demonstrada.`,
      tom: "critico",
      seguir: `Quais são os achados de ${pior[0]}?`,
    });
  }

  if (semLacuna.length) {
    insights.push({
      texto:
        `${semLacuna.length} ${semLacuna.length === 1 ? "ente não tem" : "entes não têm"} nenhuma ` +
        `lacuna: ${semLacuna.slice(0, 3).map(([n]) => n).join(", ")}` +
        (semLacuna.length > 3 ? " e outros." : "."),
      tom: "ok",
      seguir: "O que esses entes fizeram de diferente?",
    });
  }

  return insights.slice(0, 3);
}

/** Perguntas de partida, quando não há contexto de tela nenhum. */
export const PERGUNTAS_INICIAIS = [
  "Por onde um tribunal de contas deveria começar?",
  "Quais entes têm lacuna em defesa civil?",
  "Onde se avança mais com menos esforço?",
  "Compare São Paulo (estado) com Rio de Janeiro (estado).",
];
