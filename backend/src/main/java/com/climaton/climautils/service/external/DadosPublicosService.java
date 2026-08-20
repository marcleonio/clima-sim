package com.climaton.climautils.service.external;

import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.stereotype.Service;

import com.climaton.climautils.dto.enums.TipoTradeOff;
import com.climaton.climautils.dto.response.TradeOffResponse;
import com.climaton.climautils.service.external.IbgeClientService.PopulacaoResultado;
import com.climaton.climautils.service.external.SiconfiClientService.ReceitaResultado;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Cruza a entidade simulada com dados públicos oficiais (SICONFI/Tesouro Nacional
 * e IBGE) e devolve um trade-off informativo de checagem factual para a lista de
 * trade-offs da simulação.
 *
 * Contrato de robustez: este serviço NUNCA lança exceção para o chamador. Se as
 * APIs externas estiverem fora do ar, lentas ou o dado não existir para aquele
 * ano/ente, retorna null e a simulação principal segue funcionando normalmente
 * sem esse item - a checagem é estritamente aditiva, nunca bloqueante.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DadosPublicosService {

    private static final long TIMEOUT_TOTAL_SEGUNDOS = 10;

    private final SiconfiClientService siconfiClientService;
    private final IbgeClientService ibgeClientService;

    public TradeOffResponse gerarChecagemFactual(Double entityId, String entityType) {
        if (entityId == null || entityId <= 0) return null; // Agregados (Brasil, consolidados) não têm código IBGE próprio

        String codigoIbge = String.valueOf(entityId.longValue());
        boolean nivelMunicipio = codigoIbge.length() > 2; // UF = 2 dígitos; município/DF = 7 dígitos

        try {
            CompletableFuture<ReceitaResultado> receitaFuture =
                    CompletableFuture.supplyAsync(() -> siconfiClientService.buscarReceitaRealizada(codigoIbge));
            CompletableFuture<PopulacaoResultado> populacaoFuture =
                    CompletableFuture.supplyAsync(() -> ibgeClientService.buscarPopulacaoEstimada(codigoIbge, nivelMunicipio));

            CompletableFuture<TradeOffResponse> combinado = receitaFuture.thenCombine(populacaoFuture, this::montarTradeOff);
            return combinado.get(TIMEOUT_TOTAL_SEGUNDOS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("Checagem com dados públicos excedeu {}s para o ente {} - seguindo sem esse item.", TIMEOUT_TOTAL_SEGUNDOS, codigoIbge);
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (ExecutionException | RuntimeException e) {
            log.warn("Checagem com dados públicos indisponível para o ente {}: {}", codigoIbge, e.getMessage());
            return null;
        }
    }

    private TradeOffResponse montarTradeOff(ReceitaResultado receita, PopulacaoResultado populacao) {
        boolean temReceita = receita != null && receita.encontrado();
        boolean temPopulacao = populacao != null && populacao.encontrado();
        if (!temReceita && !temPopulacao) return null;

        Locale ptBr = Locale.forLanguageTag("pt-BR");
        StringBuilder descricao = new StringBuilder();

        if (temReceita) {
            descricao.append(String.format(ptBr,
                    "Receita bruta realizada em %d, declarada na DCA (fonte: SICONFI/Tesouro Nacional): R$ %,.2f. ",
                    receita.ano(), receita.receitaBrutaRealizada()));
        }
        if (temPopulacao) {
            descricao.append(String.format(ptBr,
                    "População estimada (fonte: IBGE, %d): %,d habitantes.",
                    populacao.ano(), populacao.populacao()));
        }
        if (temReceita && temPopulacao && populacao.populacao() > 0) {
            double perCapita = receita.receitaBrutaRealizada() / populacao.populacao();
            descricao.append(String.format(ptBr, " Equivale a R$ %,.2f por habitante.", perCapita));
        }

        return new TradeOffResponse(
                TipoTradeOff.NEUTRO,
                "Financiamento",
                "Checagem com Dado Público Oficial",
                descricao.toString().trim()
        );
    }
}
