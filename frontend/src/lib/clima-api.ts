// Cliente da ClimaUtils API + motor de demonstração local (fallback offline).

export type EntityScores = {
  entityId: number;
  entityType: string;
  entityName: string;
  scoreFinanciamento: number;
  scoreGovernanca: number;
  scorePoliticasPublicas: number;
  scoreGeralMedia: number;
};

export type TipoEntidade = "Federal" | "Estadual" | "Municipal";

export const TIPOS_ENTIDADE: TipoEntidade[] = ["Federal", "Estadual", "Municipal"];

// Unidades da federação (26 estados + Distrito Federal). Usadas para corrigir
// classificações incorretas vindas da base (ex.: DF marcado como município).
const UFS = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
];

const chaveNome = (n: string) =>
  n
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*\)\s*/g, "")
    .trim()
    .toLowerCase();

const UFS_KEYS = new Set(UFS.map(chaveNome));

export function ehUnidadeFederativa(nome: string): boolean {
  return UFS_KEYS.has(chaveNome(nome));
}

// A listagem de entidades pode devolver rótulos legados (ESTADO/MUNICIPIO).
export function normalizarTipoEntidade(valor: string | undefined): TipoEntidade {
  const v = (valor ?? "").toUpperCase();
  if (v.startsWith("FED")) return "Federal";
  if (v.startsWith("MUNIC")) return "Municipal";
  return "Estadual";
}

export type SimulacaoRequest = {
  tipoEntidade: TipoEntidade;
  nomeEntidade: string;
  ajusteFinanciamento: number;
  ajusteGovernanca: number;
  ajustePoliticas: number;
};

export type KpiEixoResponse = {
  chaveEixo: string;
  nomeExibicao: string;
  scoreAtual: number;
  scoreProjetado: number;
  tendencia: string;
  corSugestaoHex: string;
};

export type DataSetLinhaResponse = {
  nomeLinha: string;
  corLinhaHex: string;
  valoresAnoAAno: number[];
};

export type TradeOffTipo = "GANHO" | "PERDA" | "ALERTA" | "NEUTRO";

export type TradeOffResponse = {
  tipo: TradeOffTipo;
  eixoAfetado: string;
  titulo: string;
  descricaoAmigavel: string;
};

export type StatusAbsorcao = "MATURIDADE_ALTA" | "GARGALO_DETECTADO";
export type MaturidadeRelativa = "ACIMA_DA_MEDIA" | "DENTRO_DA_MEDIA" | "ABAIXO_DA_MEDIA";
export type NivelRiscoOperacional = "BAIXO" | "MEDIO" | "ALERTA" | "CRITICO";

export type FatorAlavancagem = {
  variacaoInvestimentoPct: number;
  impactoGeralEstimadoPct: number;
  mensagemFormatada: string;
};

export type ResumoScoreResponse = {
  scoreGeralAtual: number;
  scoreGeralProjetado: number;
  variacaoPercentual: number;
  statusGeral: string;
  taxaAbsorcaoAbsorvida: number;
  statusAbsorcao: StatusAbsorcao;
  roiClimaticoEstimado: number;
  fatorAlavancagem: FatorAlavancagem;
  maturidadeRelativa: MaturidadeRelativa;
  nivelRiscoOperacional: NivelRiscoOperacional;
  riscoDescontinuidadePct: number;
  mensagemDiagnostico: string;
};

export type SimulacaoResponse = {
  metadados: { entidadeSelecionada: string; tipoEntidade: string; dataSimulacao: string };
  resumo: ResumoScoreResponse;
  kpisEixos: KpiEixoResponse[];
  seriesTemporais: { labelsAnos: string[]; linhasGrafico: DataSetLinhaResponse[] };
  listaTradeOffs: TradeOffResponse[];
};

// Comentário original do auditor por trás de um item avaliado (ex.: "F1.A") -
// a evidência/documento que justifica a nota, hoje escondida no CSV bruto.
export type EvidenciaItem = {
  eixo: string;
  componente: string;
  item: string;
  notaTexto: string;
  dataAvaliacao: string | null;
  comentario: string;
};


const BASE_KEY = "climabrasil:apiBaseUrl";
export const DEFAULT_BASE_URL = "http://localhost:8080";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE_URL;
  return window.localStorage.getItem(BASE_KEY) || DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(BASE_KEY, url.replace(/\/$/, ""));
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 4000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- Demonstração local (usada quando a API não responde) ---------------- */

const DEMO: EntityScores[] = [
  ["Brasil (União)", "Federal", 61.7, 58.3, 56.9],
  ["Acre", "Estadual", 42.1, 51.4, 47.8],
  ["Amazonas", "Estadual", 55.3, 49.0, 52.6],
  ["Pará", "Estadual", 58.9, 44.2, 50.1],
  ["Bahia", "Estadual", 63.5, 61.8, 59.4],
  ["Ceará", "Estadual", 66.2, 70.1, 64.7],
  ["Minas Gerais", "Estadual", 71.4, 65.9, 68.3],
  ["São Paulo", "Estadual", 78.6, 74.2, 76.0],
  ["Paraná", "Estadual", 69.8, 72.5, 67.1],
  ["Rio Grande do Sul", "Estadual", 67.3, 68.4, 63.9],
  ["Distrito Federal", "Estadual", 72.6, 70.8, 69.5],
  ["Belém", "Municipal", 48.7, 45.6, 43.2],
  ["Manaus", "Municipal", 52.4, 47.9, 46.8],
  ["Recife", "Municipal", 59.1, 63.7, 57.5],
  ["Curitiba", "Municipal", 74.9, 79.3, 76.8],
  ["São Paulo", "Municipal", 81.2, 77.6, 79.4],
].map(([entityName, entityType, f, g, p], i) => ({
  entityId: i + 1,
  entityName: entityName as string,
  entityType: entityType as string,
  scoreFinanciamento: f as number,
  scoreGovernanca: g as number,
  scorePoliticasPublicas: p as number,
  scoreGeralMedia: Number((((f as number) + (g as number) + (p as number)) / 3).toFixed(1)),
}));

const clamp = (n: number) => Math.max(0, Math.min(100, Number(n.toFixed(1))));

export function demoEntidades(): Record<string, EntityScores> {
  return Object.fromEntries(DEMO.map((e) => [`${e.entityType}:${e.entityName}`, e]));
}

// Coeficientes OLS ilustrativos: cada eixo responde ao próprio ajuste e sofre
// efeito cruzado dos demais (trade-offs orçamentários e institucionais).
export function demoSimular(reqBody: SimulacaoRequest): SimulacaoResponse {
  const base = DEMO.find((e) => e.entityName === reqBody.nomeEntidade) ?? DEMO[0]!;
  const { ajusteFinanciamento: aF, ajusteGovernanca: aG, ajustePoliticas: aP } = reqBody;

  const proj = {
    fin: clamp(base.scoreFinanciamento * (1 + (aF * 0.42 - aP * 0.11 - aG * 0.04) / 100)),
    gov: clamp(base.scoreGovernanca * (1 + (aG * 0.38 + aF * 0.06 - aP * 0.05) / 100)),
    pol: clamp(base.scorePoliticasPublicas * (1 + (aP * 0.45 + aF * 0.14 + aG * 0.09) / 100)),
  };

  const atualGeral = base.scoreGeralMedia;
  const projGeral = clamp((proj.fin + proj.gov + proj.pol) / 3);
  const variacao = Number((((projGeral - atualGeral) / atualGeral) * 100).toFixed(1));

  const anos = ["Ano 1", "Ano 2", "Ano 3", "Ano 4"];
  const serie = (from: number, to: number) =>
    anos.map((_, i) => clamp(from + (to - from) * ((i + 1) / anos.length) ** 0.85));

  const kpis: KpiEixoResponse[] = [
    ["FINANCIAMENTO", "Financiamento Climático", base.scoreFinanciamento, proj.fin, "#2f9e6e"],
    ["GOVERNANCA", "Governança & Transparência", base.scoreGovernanca, proj.gov, "#3d8bbd"],
    ["POLITICAS", "Execução de Políticas", base.scorePoliticasPublicas, proj.pol, "#c98a2b"],
  ].map(([chaveEixo, nomeExibicao, atual, projetado, cor]) => ({
    chaveEixo: chaveEixo as string,
    nomeExibicao: nomeExibicao as string,
    scoreAtual: Number(atual),
    scoreProjetado: Number(projetado),
    tendencia:
      Number(projetado) - Number(atual) > 0.5
        ? "ALTA"
        : Number(projetado) - Number(atual) < -0.5
          ? "QUEDA"
          : "ESTAVEL",
    corSugestaoHex: cor as string,
  }));

  const tradeOffs: SimulacaoResponse["listaTradeOffs"] = [];
  if (aP > 10 && aF < aP)
    tradeOffs.push({
      tipo: "ALERTA",
      eixoAfetado: "Financiamento Climático",
      titulo: "Execução acelerada sem lastro financeiro",
      descricaoAmigavel:
        "Ampliar a execução de políticas em " +
        aP +
        "% sem elevar o financiamento na mesma proporção tende a consumir reservas e reduzir o score financeiro ao longo do mandato.",
    });
  if (aG < -5)
    tradeOffs.push({
      tipo: "PERDA",
      eixoAfetado: "Governança & Transparência",
      titulo: "Perda de confiança institucional",
      descricaoAmigavel:
        "Cortes em governança reduzem a capacidade de monitorar metas climáticas e encarecem a captação de recursos verdes nos anos seguintes.",
    });
  if (aF > 20)
    tradeOffs.push({
      tipo: "GANHO",
      eixoAfetado: "Execução de Políticas",
      titulo: "Financiamento destrava execução",
      descricaoAmigavel:
        "O aumento do financiamento climático gera efeito positivo cruzado sobre a execução de políticas a partir do segundo ano.",
    });
  if (!tradeOffs.length)
    tradeOffs.push({
      tipo: "NEUTRO",
      eixoAfetado: "Cenário geral",
      titulo: "Cenário equilibrado",
      descricaoAmigavel:
        "Os ajustes atuais mantêm os três eixos em equilíbrio, sem trade-offs relevantes detectados pelo modelo.",
    });

  // Capacidade de absorção: quanto da ampliação financeira a governança consegue processar.
  const absorcao = clamp(
    45 + proj.gov * 0.55 - Math.max(0, aF - aG) * 0.35 + Math.min(proj.pol, 100) * 0.08,
  );
  const statusAbsorcao: StatusAbsorcao = absorcao >= 70 ? "MATURIDADE_ALTA" : "GARGALO_DETECTADO";

  const roi = Number(Math.max(0.2, (0.6 + (absorcao / 100) * 1.1) * (proj.pol / 60)).toFixed(2));
  const impactoAlavancagem = Number((10 * roi).toFixed(1));

  const mediaBase = DEMO.reduce((s, e) => s + e.scoreGeralMedia, 0) / DEMO.length;
  const maturidadeRelativa: MaturidadeRelativa =
    projGeral > mediaBase * 1.05
      ? "ACIMA_DA_MEDIA"
      : projGeral < mediaBase * 0.95
        ? "ABAIXO_DA_MEDIA"
        : "DENTRO_DA_MEDIA";

  const riscoPct = clamp(
    Math.max(0, 100 - absorcao) * 0.5 + Math.max(0, -aG) * 0.6 + Math.max(0, aP - aF) * 0.4,
  );
  const nivelRisco: NivelRiscoOperacional =
    riscoPct >= 60 ? "CRITICO" : riscoPct >= 40 ? "ALERTA" : riscoPct >= 20 ? "MEDIO" : "BAIXO";

  return {
    metadados: {
      entidadeSelecionada: base.entityName,
      tipoEntidade: base.entityType,
      dataSimulacao: new Date().toISOString(),
    },
    resumo: {
      scoreGeralAtual: atualGeral,
      scoreGeralProjetado: projGeral,
      variacaoPercentual: variacao,
      statusGeral: variacao > 3 ? "POSITIVO" : variacao < -3 ? "CRITICO" : "ESTAVEL",
      taxaAbsorcaoAbsorvida: absorcao,
      statusAbsorcao,
      roiClimaticoEstimado: roi,
      fatorAlavancagem: {
        variacaoInvestimentoPct: 10,
        impactoGeralEstimadoPct: impactoAlavancagem,
        mensagemFormatada: `Cada +10% em Financiamento gera +${impactoAlavancagem}% de impacto se apoiado por Governança.`,
      },
      maturidadeRelativa,
      nivelRiscoOperacional: nivelRisco,
      riscoDescontinuidadePct: riscoPct,
      mensagemDiagnostico:
        variacao > 3
          ? `Ao fim dos 4 anos, ${base.entityName} avança ${variacao}% no índice climático geral.`
          : variacao < -3
            ? `O cenário simulado deteriora o índice climático de ${base.entityName} em ${Math.abs(variacao)}%.`
            : `O cenário simulado mantém ${base.entityName} praticamente estável ao longo do mandato.`,
    },

    kpisEixos: kpis,
    seriesTemporais: {
      labelsAnos: anos,
      linhasGrafico: [
        {
          nomeLinha: "Financiamento",
          corLinhaHex: "#2f9e6e",
          valoresAnoAAno: serie(base.scoreFinanciamento, proj.fin),
        },
        {
          nomeLinha: "Governança",
          corLinhaHex: "#3d8bbd",
          valoresAnoAAno: serie(base.scoreGovernanca, proj.gov),
        },
        {
          nomeLinha: "Políticas Públicas",
          corLinhaHex: "#c98a2b",
          valoresAnoAAno: serie(base.scorePoliticasPublicas, proj.pol),
        },
        {
          nomeLinha: "Índice Geral",
          corLinhaHex: "#14532d",
          valoresAnoAAno: serie(atualGeral, projGeral),
        },
      ],
    },
    listaTradeOffs: tradeOffs,
  };
}

/* ---------------- API pública com fallback ---------------- */

export type Source = "api" | "demo";

// Corrige a esfera e o nome exibido de cada entidade retornada pela base
// (ex.: Distrito Federal vinha marcado como município) e remove duplicatas.
// As unidades da federação precisam continuar aparecendo na esfera estadual, mesmo
// quando o nome coincida com uma capital/município homônimo (ex.: São Paulo).
export function sanearEntidades(data: Record<string, EntityScores>): Record<string, EntityScores> {
  const vistos = new Set<string>();
  const saneadas: [string, EntityScores][] = [];

  for (const [chave, e] of Object.entries(data)) {
    const nome = (e.entityName ?? chave)
      .replace(/\s*\((capital|munic[ií]pio|estado|uf)\)\s*/i, "")
      .trim();
    let tipo = normalizarTipoEntidade(e.entityType);
    if (tipo === "Municipal" && ehUnidadeFederativa(nome)) {
      tipo = "Estadual";
    }
    const id = `${tipo}:${chaveNome(nome)}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    saneadas.push([id, { ...e, entityName: nome, entityType: tipo }]);
  }

  return Object.fromEntries(
    saneadas.sort(([, a], [, b]) => a.entityName.localeCompare(b.entityName, "pt-BR")),
  );
}

export async function listarEntidades(): Promise<{
  data: Record<string, EntityScores>;
  source: Source;
}> {
  try {
    const data = await req<Record<string, EntityScores>>("/api/v1/simulacao/entidades");
    if (data && Object.keys(data).length) return { data: sanearEntidades(data), source: "api" };
    throw new Error("vazio");
  } catch {
    return { data: sanearEntidades(demoEntidades()), source: "demo" };
  }
}

export async function recalcular(
  body: SimulacaoRequest,
): Promise<{ data: SimulacaoResponse; source: Source }> {
  try {
    // Timeout maior que o padrão: o backend cruza com SICONFI/IBGE ao vivo na primeira
    // chamada por entidade (até ~10s frios); chamadas seguintes vêm do cache e são rápidas.
    const data = await req<SimulacaoResponse>(
      "/api/v1/simulacao/recalculate",
      { method: "POST", body: JSON.stringify(body) },
      12000,
    );
    if (!data?.resumo) throw new Error("resposta inválida");
    return { data, source: "api" };
  } catch {
    return { data: demoSimular(body), source: "demo" };
  }
}

export async function listarEvidencias(
  tipoEntidade: string | undefined,
  nomeEntidade: string,
): Promise<EvidenciaItem[]> {
  try {
    const params = new URLSearchParams({ nomeEntidade });
    if (tipoEntidade) params.set("tipoEntidade", tipoEntidade);
    return await req<EvidenciaItem[]>(`/api/v1/simulacao/evidencias?${params.toString()}`);
  } catch {
    return [];
  }
}
