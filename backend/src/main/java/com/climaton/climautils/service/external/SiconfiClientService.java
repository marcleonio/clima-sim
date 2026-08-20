package com.climaton.climautils.service.external;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Year;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Consulta a API de Dados Abertos do SICONFI (Tesouro Nacional) para obter a
 * Receita Bruta Realizada declarada na DCA (Declaração de Contas Anuais) de um
 * ente federativo, como contraponto factual e auditável ao eixo "Financiamento"
 * do Painel ClimaBrasil. Não exige token.
 *
 * Base real da API (validada em ago/2026 - a documentação simplificada costuma
 * citar só "tesouro.gov.br", que não é um host chamável):
 * https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca?an_exercicio=2023&id_ente=12&no_anexo=DCA-Anexo+I-C
 * -> {"items":[{"exercicio":2023,"cod_ibge":12,"anexo":"DCA-Anexo I-C",
 *      "coluna":"Receitas Brutas Realizadas","cod_conta":"ReceitasExcetoIntraOrcamentarias",
 *      "conta":"RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)","valor":11137410342.21,
 *      "populacao":906876}, ...], "hasMore":false, ...}
 *
 * A DCA é entregue meses após o encerramento do exercício, então o ano mais
 * recente pode ainda não estar publicado: tentamos ano corrente-1 e, se vier
 * vazio, caímos para corrente-2.
 */
@Slf4j
@Service
public class SiconfiClientService {

    private static final String URL_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca";
    private static final String ANEXO_RECEITAS = "DCA-Anexo I-C";
    private static final String CONTA_TOTAL_RECEITAS = "ReceitasExcetoIntraOrcamentarias";
    private static final String COLUNA_RECEITA_BRUTA = "Receitas Brutas Realizadas";
    private static final int TENTATIVAS_DE_ANO = 2;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache em memória por processo: dado contábil de exercício fechado não muda
    // durante o ciclo de vida da app, e evita bater no SICONFI a cada recálculo.
    private final Map<String, ReceitaResultado> cache = new ConcurrentHashMap<>();
    private static final ReceitaResultado SEM_RESULTADO = new ReceitaResultado(null, null);

    public record ReceitaResultado(Integer ano, Double receitaBrutaRealizada) {
        public boolean encontrado() {
            return ano != null && receitaBrutaRealizada != null;
        }
    }

    public ReceitaResultado buscarReceitaRealizada(String codigoIbge) {
        if (codigoIbge == null || codigoIbge.isBlank()) return SEM_RESULTADO;
        return cache.computeIfAbsent(codigoIbge, this::buscarComFallbackDeAno);
    }

    private ReceitaResultado buscarComFallbackDeAno(String codigoIbge) {
        int anoMaisRecenteProvavelmentePublicado = Year.now().getValue() - 1;

        for (int tentativa = 0; tentativa < TENTATIVAS_DE_ANO; tentativa++) {
            int ano = anoMaisRecenteProvavelmentePublicado - tentativa;
            try {
                ReceitaResultado resultado = buscarNaApi(codigoIbge, ano);
                if (resultado != null) return resultado;
            } catch (Exception e) {
                log.warn("Falha ao consultar SICONFI para ente {} ano {}: {}", codigoIbge, ano, e.getMessage());
            }
        }
        return SEM_RESULTADO;
    }

    private ReceitaResultado buscarNaApi(String codigoIbge, int ano) throws Exception {
        String anexoCodificado = URLEncoder.encode(ANEXO_RECEITAS, StandardCharsets.UTF_8);
        String url = String.format("%s?an_exercicio=%d&id_ente=%s&no_anexo=%s", URL_BASE, ano, codigoIbge, anexoCodificado);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(6))
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.warn("SICONFI respondeu HTTP {} para ente {} ano {}", response.statusCode(), codigoIbge, ano);
            return null;
        }

        return extrairReceitaBruta(response.body(), ano);
    }

    private ReceitaResultado extrairReceitaBruta(String jsonBody, int ano) throws Exception {
        JsonNode root = objectMapper.readTree(jsonBody);
        JsonNode items = root.path("items");
        if (!items.isArray() || items.isEmpty()) return null;

        for (JsonNode item : items) {
            String codConta = item.path("cod_conta").asText("");
            String coluna = item.path("coluna").asText("");
            if (CONTA_TOTAL_RECEITAS.equals(codConta) && COLUNA_RECEITA_BRUTA.equals(coluna)) {
                double valor = item.path("valor").asDouble(Double.NaN);
                if (!Double.isNaN(valor)) {
                    return new ReceitaResultado(ano, valor);
                }
            }
        }
        return null; // Ano sem essa linha publicada ainda - deixa o chamador tentar o ano anterior.
    }
}
