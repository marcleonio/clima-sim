/**
 * Trajetória de regularização — o que acontece se o ente agir.
 *
 * Substitui o simulador de cenários. A pergunta que ele fazia é boa e
 * sobrevive; o método é que não. O motor anterior treinava uma regressão sobre
 * 49 observações de um corte transversal único, sem série temporal, e aplicava
 * sobre o resultado uma matriz de coeficientes de interdependência escolhidos a
 * mão, mais uma atenuação logarítmica para a projeção não sair astronômica. Se
 * um modelo precisa de um freio arbitrário para não produzir absurdo, o que ele
 * produz dentro do freio também não é evidência.
 *
 * A resposta honesta é aritmética sobre a escala oficial, não econometria. A
 * metodologia pontua cada requisito em quatro degraus — Sem progresso 0,
 * Inicial 1/3, Intermediário 2/3, Avançado 1 — e o índice do ente é a média
 * desses valores. Logo o efeito de fazer um requisito subir um degrau é
 * calculável exatamente, sem modelo e sem parâmetro estimado. Qualquer pessoa
 * com a planilha na mão chega ao mesmo número.
 *
 * O que este módulo NÃO faz, deliberadamente: nada sobre dinheiro. O produto
 * não tem dado para dizer quanto custa sair de um degrau, e fingir que tem era
 * exatamente o erro que se está removendo.
 */

export type Degrau = 0 | 1 | 2 | 3;

export const NOME_DEGRAU: Record<Degrau, string> = {
  0: "Sem progresso",
  1: "Estágio inicial",
  2: "Estágio intermediário",
  3: "Estágio avançado",
};

/** Quantos degraus a escala oficial tem acima de zero. */
const TOPO: Degrau = 3;

export interface EnteParaTrajetoria {
  tot: number;
  lac: number;
  mat: number;
}

export interface Trajetoria {
  /** Índice hoje, 0–100. */
  atual: number;
  /** Índice depois de os requisitos escolhidos subirem `degraus`. */
  projetado: number;
  /** Diferença em pontos. */
  ganho: number;
  /** Quantos requisitos foram movidos. */
  requisitos: number;
  /** Quantos degraus cada um subiu. */
  degraus: number;
  /** Lacunas restantes depois do movimento. */
  lacunasRestantes: number;
  /** Para onde os requisitos vão. */
  destino: string;
}

/**
 * Efeito de mover `requisitos` lacunas para cima em `degraus` passos.
 *
 * Só movimenta requisitos que hoje estão em "Sem progresso" — são as lacunas,
 * que é o que o produto lista e o que uma peça de cobrança endereça. O
 * movimento é limitado ao número de lacunas que o ente realmente tem: pedir a
 * regularização de mais requisitos do que existem não é cenário, é erro.
 */
export function projetar(
  ente: EnteParaTrajetoria,
  requisitos: number,
  degraus = 1,
): Trajetoria {
  const passos = Math.max(0, Math.min(TOPO, Math.round(degraus))) as Degrau;
  const movidos = Math.max(0, Math.min(ente.lac, Math.round(requisitos)));

  const atual = ente.tot > 0 ? ente.mat : 0;

  // Cada requisito que sobe um degrau acrescenta (1/3) à soma de pontos, e o
  // índice é essa soma dividida pelo total de requisitos avaliados.
  const ganhoBruto = ente.tot > 0 ? (100 * (movidos * (passos / TOPO))) / ente.tot : 0;
  const projetado = Math.min(100, Math.round((atual + ganhoBruto) * 10) / 10);

  return {
    atual,
    projetado,
    ganho: Math.round((projetado - atual) * 10) / 10,
    requisitos: movidos,
    degraus: passos,
    // Um requisito que sai de "Sem progresso" deixa de ser lacuna, qualquer que
    // seja o degrau a que chegue.
    lacunasRestantes: passos > 0 ? ente.lac - movidos : ente.lac,
    destino: NOME_DEGRAU[passos],
  };
}

export interface PosicaoProjetada {
  atual: number;
  projetada: number;
  ganho: number;
  total: number;
}

/**
 * Para onde o ente vai no ranking de fragilidade, se a trajetória se realizar.
 *
 * O ranking é por taxa de lacuna decrescente — 1 é o mais frágil. Recebe as
 * taxas dos demais entes para não precisar da base inteira.
 */
export function posicaoProjetada(
  ente: EnteParaTrajetoria,
  trajetoria: Pick<Trajetoria, "lacunasRestantes">,
  taxasDosOutros: number[],
  rankAtual: number,
): PosicaoProjetada {
  const total = taxasDosOutros.length + 1;
  const taxaNova = ente.tot > 0 ? (100 * trajetoria.lacunasRestantes) / ente.tot : 0;

  // Quantos entes ficam com taxa maior que a nova taxa deste ente.
  const piores = taxasDosOutros.filter((t) => t > taxaNova).length;
  const projetada = piores + 1;

  return { atual: rankAtual, projetada, ganho: projetada - rankAtual, total };
}

/** Frase pronta para a peça e para a tela — sem jargão e sem promessa. */
export function descreverTrajetoria(
  nomeEnte: string,
  trajetoria: Trajetoria,
  posicao?: PosicaoProjetada,
): string {
  if (trajetoria.requisitos === 0 || trajetoria.degraus === 0) {
    return `Nenhum requisito selecionado — o índice de ${nomeEnte} permanece em ${fmt(trajetoria.atual)}.`;
  }

  const plural = trajetoria.requisitos === 1 ? "requisito sair" : "requisitos saírem";
  const base =
    `Se ${trajetoria.requisitos} ${plural} de “Sem progresso” para “${trajetoria.destino}”, ` +
    `o índice de ${nomeEnte} vai de ${fmt(trajetoria.atual)} para ${fmt(trajetoria.projetado)}`;

  if (!posicao || posicao.ganho === 0) return `${base}.`;

  return (
    `${base} e o ente passa da ${posicao.atual}ª para a ${posicao.projetada}ª posição ` +
    `em fragilidade entre os ${posicao.total} avaliados.`
  );
}

function fmt(valor: number): string {
  return `${valor.toFixed(1).replace(".", ",")}%`;
}
