/**
 * O vocabulário que aparece na tela.
 *
 * POR QUE ISTO EXISTE NUM ARQUIVO SÓ
 *
 * O produto nasceu com termos inventados por nós — "achado", "maturidade
 * climática" — e nenhum dos dois é o que a metodologia oficial usa. Auditores
 * que leram disseram que "maturidade climática" não é como se fala da coisa.
 * Termo errado num produto de controle externo não é detalhe de redação: é o
 * leitor percebendo que quem escreveu não conhece o domínio.
 *
 * Como a nomenclatura já mudou uma vez e pode mudar de novo quando mais gente
 * do TCU olhar, ela mora aqui — um lugar só, auditável, em vez de espalhada em
 * trezentas strings.
 *
 * FONTE: Manual do Painel ClimaBrasil, p. 5–6.
 *
 *   "Os Tribunais de Contas vão avaliar cada ITEM de cada componente [...]
 *    usando uma escala com quatro níveis [...]: 'sem progresso', 'estágio
 *    inicial', 'estágio intermediário' e 'estágio avançado'."
 *
 *   "A média das PONTUAÇÕES de todos os itens avaliados em um componente será
 *    usada para calcular a PONTUAÇÃO FINAL desse componente."
 *
 *   "os componentes que tiverem pontuação igual ou inferior a 33% serão
 *    considerados DESAFIOS [...]. Já os componentes com pontuação igual ou
 *    superior a 67% serão classificados como PONTOS FORTES."
 *
 * O que mudou, e o que não:
 *
 *   nosso "achado"              → "item de avaliação" (sem progresso)
 *   nosso "maturidade"          → "pontuação", sempre em %
 *   nosso "crítico/atenção/…"   → "desafio" e "ponto forte", nas faixas oficiais
 *
 * Identificadores internos (variáveis, tipos, nomes de arquivo, a rota
 * /achados) continuam como estão de propósito: renomeá-los produziria um diff
 * enorme sem ganho para quem usa, e mudar a rota quebraria todo link já
 * compartilhado.
 */

/** O item avaliado. Plural e singular, porque a contagem varia na tela. */
export const ITEM = {
  singular: "item de avaliação",
  plural: "itens de avaliação",
  /** Forma curta, quando o contexto já disse que são itens de avaliação. */
  curtoSingular: "item",
  curtoPlural: "itens",
} as const;

/** O índice 0–100. Sempre acompanhado do símbolo de porcentagem. */
export const PONTUACAO = {
  nome: "pontuação",
  nomeCapitalizado: "Pontuação",
  /** Como explicar de onde ela vem, quando há espaço para uma linha. */
  explicacao:
    "Média das notas dos itens na escala oficial: sem progresso 0%, estágio inicial 33%, intermediário 67%, avançado 100%.",
} as const;

/** A classificação de um item, na escala oficial de quatro níveis. */
export const CLASSIFICACAO = [
  "Sem progresso",
  "Estágio inicial",
  "Estágio intermediário",
  "Estágio avançado",
] as const;

/**
 * As faixas qualitativas oficiais.
 *
 * Não são invenção nossa nem escolha de design: o manual define ≤ 33% como
 * desafio e ≥ 67% como ponto forte. O meio não recebe rótulo na metodologia, e
 * também não recebe aqui — inventar um nome para ele seria voltar ao problema
 * que este arquivo existe para resolver.
 */
export type Faixa = "desafio" | "intermediaria" | "ponto-forte";

export const FAIXA_ROTULO: Record<Faixa, string> = {
  desafio: "Desafio",
  intermediaria: "Intermediário",
  "ponto-forte": "Ponto forte",
};

export function faixaDe(pontuacao: number): Faixa {
  if (pontuacao <= 33) return "desafio";
  if (pontuacao >= 67) return "ponto-forte";
  return "intermediaria";
}

/** "1 item de avaliação" · "43 itens de avaliação" */
export function contarItens(quantidade: number, curto = false): string {
  const termo =
    quantidade === 1
      ? curto
        ? ITEM.curtoSingular
        : ITEM.singular
      : curto
        ? ITEM.curtoPlural
        : ITEM.plural;
  return `${quantidade} ${termo}`;
}

/** "1 item sem progresso" · "43 itens sem progresso" */
export function contarSemProgresso(quantidade: number): string {
  return `${contarItens(quantidade, true)} sem progresso`;
}
