import { COMPONENTES_CRITICOS } from "@/lib/achados";
import type { EnteResumo } from "@/lib/dados";
import { comunidadeDe, pontesPara, type Ponte } from "@/lib/grafo";
import { alavancagemDe } from "@/lib/prioridade";
import { projetar } from "@/lib/trajetoria";

/**
 * O plano de ação: o que o gestor faz com a informação do painel.
 *
 * O painel dizia onde está pior. Isso é diagnóstico, e diagnóstico sozinho não
 * é acionável — a pergunta seguinte, que ninguém respondia, é "e agora, em que
 * ordem eu ataco?".
 *
 * A ordenação tem uma lógica declarada, não um peso escondido:
 *
 *   1. PROTEGE VIDA PRIMEIRO. Defesa civil (P5) e adaptação (P2) existem para
 *      proteger a população em evento extremo. Nada passa na frente.
 *   2. DEPOIS O QUE JÁ COMEÇOU. Um componente com itens em estágio parcial
 *      custa menos para avançar — é a alavancagem da etapa E2.
 *   3. DEPOIS O QUE TEM PRECEDENTE. Se alguém com o mesmo perfil de fragilidade
 *      já resolveu, existe caminho documentado e a quem perguntar.
 *   4. POR ÚLTIMO, O DÉFICIT BRUTO.
 *
 * O que este módulo NÃO faz: não estima prazo, não estima custo e não atribui
 * responsável. A base não tem nada disso, e um plano que inventa cronograma é
 * pior que nenhum plano — ele dá ao gestor uma promessa que o dado não sustenta.
 * Os campos ficam em branco na peça, para serem preenchidos por quem sabe.
 */

export type Motivo = "vida" | "alavancagem" | "precedente" | "deficit";

export const MOTIVO: Record<Motivo, { rotulo: string; explica: string }> = {
  vida: {
    rotulo: "Protege vida",
    explica: "Requisito de defesa civil ou adaptação — existe para proteger a população em evento extremo.",
  },
  alavancagem: {
    rotulo: "Já começou",
    explica: "Há itens em estágio parcial: avançar daqui custa menos que partir do zero.",
  },
  precedente: {
    rotulo: "Tem precedente",
    explica: "Ente com o mesmo perfil de fragilidade já resolveu — há caminho documentado e a quem perguntar.",
  },
  deficit: {
    rotulo: "Maior déficit",
    explica: "Entra pela distância até o topo da escala.",
  },
};

export interface PassoDoPlano {
  ordem: number;
  componente: string;
  nomeComponente: string;
  eixo: string;
  /** Itens sem progresso neste componente. */
  semProgresso: number;
  avaliados: number;
  pontuacao: number;
  /** Por que este passo está nesta posição. */
  motivos: Motivo[];
  /** Quanto a pontuação do ente sobe se este componente for regularizado. */
  ganhoSePontuar: number;
  /** Quem já resolveu, quando há precedente. */
  precedente: Ponte | null;
}

export interface Plano {
  ente: string;
  pontuacaoAtual: number;
  passos: PassoDoPlano[];
  /** Pontuação se todos os passos forem cumpridos. */
  pontuacaoAoFim: number;
  /** A regra de ordenação, escrita — para a peça poder citar. */
  criterio: string;
}

const CRITERIO =
  "Ordenado por: requisitos que protegem vida primeiro; depois os que já têm ação parcial " +
  "iniciada, que custam menos para avançar; depois os que têm precedente documentado em ente " +
  "de perfil semelhante; por último, o maior déficit. Não estima prazo, custo nem responsável.";

/**
 * Monta o plano para um ente.
 *
 * `nomesComponentes` e `eixos` vêm de fora porque este módulo não deve conhecer
 * o formato do índice — ele calcula ordem, não carrega dado.
 */
export function planoDeAcao(
  nome: string,
  ente: EnteResumo,
  nomesComponentes: Record<string, string>,
  eixoDe: (componente: string) => string,
): Plano {
  const precedentes = pontesPara(nome, (c) => (ente.comps[c]?.l ?? 0) > 0);
  const porComponente = new Map(precedentes.map((p) => [p.componente, p]));

  const candidatos = Object.entries(ente.comps)
    .filter(([, r]) => r.l > 0)
    .map(([c, r]) => {
      const motivos: Motivo[] = [];

      if ((COMPONENTES_CRITICOS as readonly string[]).includes(c)) motivos.push("vida");
      if (alavancagemDe(r.d, r.t) > 0) motivos.push("alavancagem");
      if (porComponente.has(c)) motivos.push("precedente");
      if (!motivos.length) motivos.push("deficit");

      return {
        componente: c,
        nomeComponente: nomesComponentes[c] ?? c,
        eixo: eixoDe(c),
        semProgresso: r.l,
        avaliados: r.t,
        pontuacao: r.m,
        motivos,
        // O ganho é a aritmética da escala: cada item que sobe um degrau
        // acrescenta 1/3 à soma, dividido pelo total de itens do ente.
        ganhoSePontuar: ente.tot > 0 ? Math.round((100 * (r.l / 3)) / ente.tot * 10) / 10 : 0,
        precedente: porComponente.get(c) ?? null,
      };
    });

  /** Peso de posição, não de mérito: só serve para ordenar. */
  const posicao = (p: (typeof candidatos)[number]) =>
    (p.motivos.includes("vida") ? 0 : 100) +
    (p.motivos.includes("alavancagem") ? 0 : 10) +
    (p.motivos.includes("precedente") ? 0 : 5);

  const ordenados = candidatos.sort(
    (a, b) =>
      posicao(a) - posicao(b) ||
      b.ganhoSePontuar - a.ganhoSePontuar ||
      a.pontuacao - b.pontuacao ||
      a.componente.localeCompare(b.componente),
  );

  const aoFim = projetar(ente, ente.lac, 1);

  return {
    ente: nome,
    pontuacaoAtual: ente.mat,
    pontuacaoAoFim: aoFim.projetado,
    criterio: CRITERIO,
    passos: ordenados.map((p, i) => ({ ...p, ordem: i + 1 })),
  };
}

/** O plano em texto corrido, para entrar na peça. */
export function descreverPlano(plano: Plano): string[] {
  return plano.passos.map((p) => {
    const razoes = p.motivos.map((m) => MOTIVO[m].rotulo.toLowerCase()).join(", ");
    const precedente = p.precedente
      ? ` ${p.precedente.resolveram.join(" e ")} já ${
          p.precedente.resolveram.length === 1 ? "resolveu" : "resolveram"
        } este componente.`
      : "";

    return (
      `${p.ordem}. ${p.componente} — ${p.nomeComponente}: ${p.semProgresso} de ${p.avaliados} ` +
      `${p.semProgresso === 1 ? "item" : "itens"} sem progresso (${razoes}). ` +
      `Regularizar todos eleva a pontuação do ente em ${p.ganhoSePontuar
        .toFixed(1)
        .replace(".", ",")} pontos percentuais.${precedente}`
    );
  });
}

/** Quantos passos protegem vida — a manchete do plano. */
export function passosQueProtegemVida(plano: Plano): number {
  return plano.passos.filter((p) => p.motivos.includes("vida")).length;
}

/** O grupo de semelhança do ente, quando existe — para a peça citar. */
export function grupoDoEnte(nome: string): string | null {
  const c = comunidadeDe(nome);
  if (!c || !c.generalizavel) return null;
  return `G${c.id + 1}`;
}
