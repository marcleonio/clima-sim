import bruto from "@/data/enso.json";
import { COMPONENTES_CRITICOS } from "@/lib/achados";
import { ENTES, type EnteResumo } from "@/lib/dados";
import { regiaoDe, type Regiao } from "@/lib/territorio";

/**
 * A fase do ENSO como sinal de decisão.
 *
 * Tudo no produto olha para trás — o que a auditoria encontrou numa extração de
 * setembro de 2025. O ENSO é a única fonte pública que permite olhar para a
 * PRÓXIMA ESTAÇÃO sem inventar previsão: o ONI é medição publicada pela NOAA, e
 * a associação entre fase e anomalia de chuva no Brasil é climatologia
 * estabelecida.
 *
 * A LINHA QUE ESTE MÓDULO NÃO ATRAVESSA
 *
 * Não prevê desastre e não afirma que a omissão causará dano. A afirmação
 * defensável é de COINCIDÊNCIA entre exposição e omissão: "este ente está em
 * região historicamente associada a anomalia de chuva na fase atual, e não
 * demonstrou ação nos requisitos que existem para lidar com isso". Toda
 * formulação exposta ao usuário sai daqui, justamente para não haver duas
 * redações diferentes espalhadas pela interface.
 */

export interface LeituraEnso {
  /** Trimestre móvel, no código da NOAA: "MJJ" = maio-junho-julho. */
  t: string;
  a: number;
  v: number;
}

export interface Enso {
  fonte: string;
  url: string;
  extraidoEm: string;
  leituras: number;
  inicioDaSerie: string;
  atual: {
    trimestre: string;
    ano: number;
    anomalia: number;
    fase: "El Niño" | "La Niña" | "Neutro";
    intensidade: string | null;
    variacaoEmSeisTrimestres: number;
    direcao: "subindo" | "caindo" | "estável";
  };
  serie: LeituraEnso[];
  eventosFortes: { fase: string; trimestre: string; ano: number; pico: number }[];
  aviso: string;
}

export const ENSO = bruto as unknown as Enso;

/** Os meses de cada trimestre móvel, para a data virar texto legível. */
const MES = "JFMAMJJASOND";
export function trimestreLegivel(t: string, ano: number): string {
  const nomes: Record<string, string> = {
    J: "jan", F: "fev", M: "mar", A: "abr", S: "set", O: "out", N: "nov", D: "dez",
  };
  void MES;
  void nomes;
  return `${t} de ${ano}`;
}

/**
 * As regiões climatologicamente associadas a anomalia na fase atual.
 *
 * Isto é climatologia consolidada, não modelo nosso: El Niño está associado a
 * seca no Norte e Nordeste e a chuva acima da média no Sul; La Niña, ao padrão
 * aproximadamente inverso. A associação é estatística e regional — não diz nada
 * sobre um município em particular nem sobre uma estação em particular.
 */
export interface AssociacaoClimatica {
  regioes: Regiao[];
  padrao: string;
}

export function associacaoDaFase(fase: Enso["atual"]["fase"]): AssociacaoClimatica | null {
  if (fase === "El Niño") {
    return {
      regioes: ["Norte", "Nordeste", "Sul"],
      padrao:
        "chuva abaixo da média no Norte e no Nordeste, e acima da média no Sul",
    };
  }
  if (fase === "La Niña") {
    return {
      regioes: ["Nordeste", "Sul", "Norte"],
      padrao:
        "chuva acima da média no Norte, irregular no Nordeste e abaixo da média no Sul",
    };
  }
  return null;
}

/** Como descrever a fase atual em uma linha, sem adjetivo de alarme. */
export function descreverFase(): string {
  const { fase, intensidade, anomalia, trimestre, ano, direcao } = ENSO.atual;
  const nome = intensidade ? `${fase} ${intensidade}` : fase;
  const valor = anomalia.toFixed(2).replace(".", ",");
  return `${nome} · ONI ${anomalia > 0 ? "+" : ""}${valor} em ${trimestre} de ${ano}, ${direcao}`;
}

export interface EnteEmAtencao {
  nome: string;
  ente: EnteResumo;
  regiao: Regiao;
  /** Componentes críticos em que o ente está sem progresso. */
  criticos: string[];
}

/**
 * Entes na região associada à fase atual QUE TAMBÉM estão sem progresso em
 * defesa civil ou adaptação.
 *
 * É a coincidência entre exposição e omissão — a pauta de fiscalização para a
 * estação que vem. Ordena pela população, porque o alcance da omissão é o que
 * diferencia dois entes igualmente omissos.
 */
export function entesEmAtencao(limite = 10): EnteEmAtencao[] {
  const associacao = associacaoDaFase(ENSO.atual.fase);
  if (!associacao) return [];

  const alvo = new Set<Regiao>(associacao.regioes);

  return Object.entries(ENTES)
    .flatMap(([nome, ente]) => {
      const regiao = regiaoDe(ente.id);
      if (!regiao || !alvo.has(regiao)) return [];

      const criticos = (COMPONENTES_CRITICOS as readonly string[]).filter(
        (c) => (ente.comps[c]?.l ?? 0) > 0,
      );
      if (!criticos.length) return [];

      return [{ nome, ente, regiao, criticos }];
    })
    .sort((a, b) => (b.ente.pop ?? 0) - (a.ente.pop ?? 0))
    .slice(0, limite);
}

/**
 * O parágrafo de contexto sazonal da peça.
 *
 * Escrito uma vez, aqui, para não existirem duas redações diferentes — e para
 * a ressalva viajar junto com a afirmação, sempre.
 */
export function paragrafoSazonal(nomeEnte: string, regiao: Regiao | null): string | null {
  const associacao = associacaoDaFase(ENSO.atual.fase);
  if (!associacao || !regiao || !associacao.regioes.includes(regiao)) return null;

  const { fase, intensidade, anomalia, trimestre, ano } = ENSO.atual;
  const nome = intensidade ? `${fase} ${intensidade}` : fase;

  return (
    `Contexto sazonal: a leitura mais recente do Oceanic Niño Index, publicada pelo Climate ` +
    `Prediction Center da NOAA, é de ${anomalia > 0 ? "+" : ""}${anomalia
      .toFixed(2)
      .replace(".", ",")} em ${trimestre} de ${ano}, o que caracteriza ${nome}. ` +
    `A climatologia associa essa fase a ${associacao.padrao}; ${nomeEnte} está na região ${regiao}. ` +
    `Registra-se a coincidência entre essa exposição e a ausência de ação demonstrada nos itens ` +
    `acima, sem que disso se infira relação de causa ou previsão de evento.`
  );
}
