import type { EntityScores } from "./types"

/**
 * Base de contingência usada quando a API ClimaUtils (http://localhost:8080)
 * não está acessível. Os valores replicam a estrutura do CSV de notas.
 */
type Linha = [nome: string, fin: number, gov: number, pol: number]

const ESTADOS: Linha[] = [
  ["Acre", 41.2, 38.6, 44.1],
  ["Alagoas", 46.8, 51.3, 43.9],
  ["Amapá", 37.5, 34.2, 39.8],
  ["Amazonas", 58.4, 47.9, 52.6],
  ["Bahia", 63.1, 61.7, 59.4],
  ["Ceará", 68.9, 71.2, 66.3],
  ["Distrito Federal", 72.4, 76.8, 64.1],
  ["Espírito Santo", 64.7, 68.3, 61.9],
  ["Goiás", 57.2, 59.8, 54.6],
  ["Maranhão", 44.3, 42.1, 46.7],
  ["Mato Grosso", 55.9, 48.4, 51.2],
  ["Mato Grosso do Sul", 59.6, 57.1, 55.8],
  ["Minas Gerais", 69.3, 66.4, 68.1],
  ["Pará", 61.8, 49.6, 57.3],
  ["Paraíba", 48.7, 53.9, 47.2],
  ["Paraná", 71.6, 73.4, 69.8],
  ["Pernambuco", 62.4, 64.9, 60.2],
  ["Piauí", 45.1, 47.8, 44.6],
  ["Rio de Janeiro", 70.2, 62.7, 65.4],
  ["Rio Grande do Norte", 51.3, 55.6, 49.8],
  ["Rio Grande do Sul", 68.4, 70.9, 67.2],
  ["Rondônia", 43.6, 40.2, 45.9],
  ["Roraima", 36.2, 33.7, 38.4],
  ["Santa Catarina", 73.8, 75.2, 71.4],
  ["São Paulo", 79.4, 77.6, 74.9],
  ["Sergipe", 49.6, 52.4, 48.1],
  ["Tocantins", 42.8, 44.6, 43.2],
]

const MUNICIPIOS: Linha[] = [
  ["Belém", 54.2, 46.8, 51.3],
  ["Belo Horizonte", 71.4, 69.8, 67.2],
  ["Campinas", 74.6, 72.1, 70.4],
  ["Curitiba", 82.3, 79.6, 78.1],
  ["Florianópolis", 76.8, 74.2, 72.9],
  ["Fortaleza", 66.4, 68.9, 63.7],
  ["Goiânia", 58.9, 60.4, 56.2],
  ["Manaus", 56.7, 48.3, 53.1],
  ["Porto Alegre", 72.9, 71.6, 69.4],
  ["Recife", 68.2, 66.7, 64.8],
  ["Rio de Janeiro", 73.1, 63.4, 66.9],
  ["Salvador", 64.8, 62.3, 61.1],
  ["São Luís", 47.6, 45.2, 48.3],
  ["São Paulo", 84.2, 80.7, 79.6],
  ["Sorocaba", 63.4, 65.8, 60.9],
]

function montar(linhas: Linha[], tipo: string, offsetId: number): EntityScores[] {
  return linhas.map(([entityName, fin, gov, pol], i) => ({
    entityId: offsetId + i + 1,
    entityType: tipo,
    entityName,
    scoreFinanciamento: fin,
    scoreGovernanca: gov,
    scorePoliticasPublicas: pol,
    scoreGeralMedia: Number(((fin + gov + pol) / 3).toFixed(1)),
  }))
}

export const ENTIDADES_BASE: EntityScores[] = [
  ...montar(ESTADOS, "ESTADO", 0),
  ...montar(MUNICIPIOS, "MUNICIPIO", 100),
]

export function buscarEntidadeBase(nome: string, tipo: string): EntityScores | undefined {
  const alvo = nome.trim().toLocaleLowerCase("pt-BR")
  const tipoAlvo = tipo.trim().toLocaleUpperCase("pt-BR")
  return (
    ENTIDADES_BASE.find(
      (e) => e.entityName.toLocaleLowerCase("pt-BR") === alvo && e.entityType === tipoAlvo,
    ) ?? ENTIDADES_BASE.find((e) => e.entityName.toLocaleLowerCase("pt-BR") === alvo)
  )
}
