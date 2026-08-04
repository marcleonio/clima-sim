export type TipoEntidade = "ESTADO" | "MUNICIPIO"

export interface EntityScores {
  entityId: number
  entityType: string
  entityName: string
  scoreFinanciamento: number
  scoreGovernanca: number
  scorePoliticasPublicas: number
  scoreGeralMedia: number
}

export interface SimulacaoRequest {
  tipoEntidade: string
  nomeEntidade: string
  ajusteFinanciamento: number
  ajusteGovernanca: number
  ajustePoliticas: number
}

export interface MetadadosResponse {
  entidadeSelecionada: string
  tipoEntidade: string
  dataSimulacao: string
}

export interface ResumoScoreResponse {
  scoreGeralAtual: number
  scoreGeralProjetado: number
  variacaoPercentual: number
  statusGeral: string
  mensagemDiagnostico: string
}

export interface KpiEixoResponse {
  chaveEixo: string
  nomeExibicao: string
  scoreAtual: number
  scoreProjetado: number
  tendencia: string
  corSugestaoHex: string
}

export interface DataSetLinhaResponse {
  nomeLinha: string
  corLinhaHex: string
  valoresAnoAAno: number[]
}

export interface SeriesTemporaisResponse {
  labelsAnos: string[]
  linhasGrafico: DataSetLinhaResponse[]
}

export interface TradeOffResponse {
  tipo: string
  eixoAfetado: string
  titulo: string
  descricaoAmigavel: string
}

export interface SimulacaoResponse {
  metadados: MetadadosResponse
  resumo: ResumoScoreResponse
  kpisEixos: KpiEixoResponse[]
  seriesTemporais: SeriesTemporaisResponse
  listaTradeOffs: TradeOffResponse[]
  /** Origem do cálculo: "api" quando veio do backend ClimaUtils, "local" no modelo de contingência. */
  origemCalculo?: "api" | "local"
}
