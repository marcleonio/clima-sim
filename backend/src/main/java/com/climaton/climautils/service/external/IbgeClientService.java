package com.climaton.climautils.service.external;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Consulta a API de Dados Agregados do IBGE (SIDRA) para obter a população
 * estimada mais recente de um Estado (nível N3) ou Município (nível N6),
 * usando o código IBGE que já vem no dataset do Painel ClimaBrasil (campo
 * entity_id). Não exige token.
 *
 * Contrato de resposta verificado manualmente em ago/2026, ex.:
 * GET .../agregados/6579/periodos/-3/variaveis/9324?localidades=N3[12]
 * -> [{"id":"9324","variavel":"...","resultados":[{"series":[{"localidade":{...},
 *      "serie":{"2024":"880631","2025":"884372"}}]}]}]
 */
@Slf4j
@Service
public class IbgeClientService {

    private static final String AGREGADO_POPULACAO_ESTIMADA = "6579"; // Estimativas de População
    private static final String VARIAVEL_POPULACAO_ESTIMADA = "9324";
    private static final String URL_TEMPLATE =
            "https://servicodados.ibge.gov.br/api/v3/agregados/%s/periodos/-3/variaveis/%s?localidades=%s[%s]";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache em memória por processo: dado de população não muda dentro do ciclo de vida da app,
    // e evita bater na API do IBGE a cada slider arrastado pelo usuário.
    private final Map<String, PopulacaoResultado> cache = new ConcurrentHashMap<>();
    private static final PopulacaoResultado SEM_RESULTADO = new PopulacaoResultado(null, null);

    public record PopulacaoResultado(Integer ano, Long populacao) {
        public boolean encontrado() {
            return ano != null && populacao != null;
        }
    }

    /**
     * @param codigoIbge   código IBGE do ente (2 dígitos para UF, 7 para município/DF)
     * @param nivelMunicipio true se o código é de município ou DF (nível N6 do SIDRA),
     *                       false se é de UF (nível N3)
     */
    public PopulacaoResultado buscarPopulacaoEstimada(String codigoIbge, boolean nivelMunicipio) {
        if (codigoIbge == null || codigoIbge.isBlank()) return SEM_RESULTADO;

        String chaveCache = (nivelMunicipio ? "N6:" : "N3:") + codigoIbge;
        PopulacaoResultado resultado = cache.computeIfAbsent(chaveCache, k -> buscarNaApiOuVazio(codigoIbge, nivelMunicipio));
        return resultado;
    }

    private PopulacaoResultado buscarNaApiOuVazio(String codigoIbge, boolean nivelMunicipio) {
        try {
            PopulacaoResultado encontrado = buscarNaApi(codigoIbge, nivelMunicipio);
            return encontrado != null ? encontrado : SEM_RESULTADO;
        } catch (Exception e) {
            log.warn("Falha ao consultar população IBGE para código {}: {}", codigoIbge, e.getMessage());
            return SEM_RESULTADO;
        }
    }

    private PopulacaoResultado buscarNaApi(String codigoIbge, boolean nivelMunicipio) throws Exception {
        String nivel = nivelMunicipio ? "N6" : "N3";
        String url = String.format(URL_TEMPLATE, AGREGADO_POPULACAO_ESTIMADA, VARIAVEL_POPULACAO_ESTIMADA, nivel, codigoIbge);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.warn("IBGE respondeu HTTP {} para código {}", response.statusCode(), codigoIbge);
            return null;
        }

        return extrairAnoMaisRecente(response.body());
    }

    private PopulacaoResultado extrairAnoMaisRecente(String jsonBody) throws Exception {
        JsonNode root = objectMapper.readTree(jsonBody);
        JsonNode serie = root.path(0).path("resultados").path(0).path("series").path(0).path("serie");
        if (!serie.isObject() || serie.isEmpty()) return null;

        Integer melhorAno = null;
        Long melhorPopulacao = null;
        Iterator<String> anos = serie.fieldNames();
        while (anos.hasNext()) {
            String anoStr = anos.next();
            try {
                int ano = Integer.parseInt(anoStr);
                long pop = Long.parseLong(serie.get(anoStr).asText());
                if (melhorAno == null || ano > melhorAno) {
                    melhorAno = ano;
                    melhorPopulacao = pop;
                }
            } catch (NumberFormatException ignorado) {
                // Período com valor não numérico (ex.: "..." quando o dado ainda não foi publicado).
            }
        }
        return melhorAno == null ? null : new PopulacaoResultado(melhorAno, melhorPopulacao);
    }
}
