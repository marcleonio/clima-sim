package com.climaton.climautils.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.apache.commons.math3.stat.regression.OLSMultipleLinearRegression;
import org.springframework.stereotype.Service;

import com.climaton.climautils.dto.ModificadoresEntidade;
import com.climaton.climautils.dto.enums.TipoTradeOff;
import com.climaton.climautils.dto.request.SimulacaoRequest;
import com.climaton.climautils.dto.response.DataSetLinhaResponse;
import com.climaton.climautils.dto.response.KpiEixoResponse;
import com.climaton.climautils.dto.response.MetadadosResponse;
import com.climaton.climautils.dto.response.ResumoScoreResponse;
import com.climaton.climautils.dto.response.SeriesTemporaisResponse;
import com.climaton.climautils.dto.response.SimulacaoResponse;
import com.climaton.climautils.dto.response.TradeOffResponse;
import com.climaton.climautils.model.EntityScores;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegressionEngineService {

    private final CsvLoaderService csvLoaderService;
    private double[] betaCoefficientsPol; // Coeficientes da regressão

    @PostConstruct
    public void initDataAndTrainModel() {
        Map<String, EntityScores> data = csvLoaderService.loadAndAggregateCsv();
        if (!data.isEmpty()) {
            trainModel(data.values());
        }
    }

    private void trainModel(Collection<EntityScores> entities) {
        int n = entities.size();

        double[] y = new double[n];
        double[][] x = new double[n][2];

        int i = 0;
        for (EntityScores e : entities) {
            y[i] = e.getScorePoliticasPublicas();
            x[i][0] = e.getScoreFinanciamento();
            x[i][1] = e.getScoreGovernanca();
            i++;
        }

        OLSMultipleLinearRegression regression = new OLSMultipleLinearRegression();
        regression.newSampleData(y, x);

        this.betaCoefficientsPol = regression.estimateRegressionParameters();
        log.info(">>> Modelo OLS Treinado com Sucesso! Coeficientes: {}", Arrays.toString(betaCoefficientsPol));
    }

    public SimulacaoResponse executarSimulacao(SimulacaoRequest request) {
        if (this.betaCoefficientsPol == null) {
            throw new IllegalStateException("O modelo OLS ainda não foi treinado.");
        }

        Map<String, EntityScores> database = csvLoaderService.loadAndAggregateCsv();
        String key = request.nomeEntidade() != null ? request.nomeEntidade().toLowerCase() : "acre";
        EntityScores base = database.getOrDefault(key, database.values().iterator().next());

        // Capturar o tipo da entidade (seja do request ou da entidade carregada do banco)
        String tipoEntidadeStr = request.tipoEntidade() != null
                ? request.tipoEntidade().name()
                : base.getEntityType();

        ModificadoresEntidade mod = obterModificadoresEntidade(tipoEntidadeStr);

        // 0. Converter notas base para escala 0-100 (multiplicando por 20)
        double baseFin100 = base.getScoreFinanciamento() <= 1.0
                ? base.getScoreFinanciamento() * 100.0
                : (base.getScoreFinanciamento() / 5.0) * 100.0;

        double baseGov100 = base.getScoreGovernanca() <= 1.0
                ? base.getScoreGovernanca() * 100.0
                : (base.getScoreGovernanca() / 5.0) * 100.0;

        double basePol100 = base.getScorePoliticasPublicas() <= 1.0
                ? base.getScorePoliticasPublicas() * 100.0
                : (base.getScorePoliticasPublicas() / 5.0) * 100.0;

        // Captura das solicitações do usuário (-100% a +100%)
        double adjFinReq = request.ajusteFinanciamento();
        double adjGovReq = request.ajusteGovernanca();
        double adjPolReq = request.ajustePoliticas();

        // 1. MATRIZ DE IMPACTOS CRUZADOS (SISTEMA BIDIRECIONAL REAIS)

        // A. IMPACTO EM FINANCIAMENTO
        // + Gov atrai fundos | - Pol perde repasses por inexecução | + Pol sem Fin gera déficit
        double efeitoFin = adjFinReq
                + (adjGovReq > 0 ? adjGovReq * mod.pesoGovFin() : adjGovReq * 0.40)
                + (adjPolReq < 0 ? adjPolReq * 0.35 : 0.0)
                + (adjPolReq > 10.0 && adjFinReq <= 0 ? adjPolReq * -0.30 : 0.0);

        // B. IMPACTO EM GOVERNANÇA
        // - Pol desacelera transparência/engajamento | + Pol sem Gov gera atropelo burocrático | - Fin corta equipe técnica
        double efeitoGov = adjGovReq
                + (adjPolReq < 0 ? adjPolReq * 0.20 : 0.0)
                + (adjFinReq < 0 ? adjFinReq * 0.15 : 0.0)
                + (adjPolReq > 20.0 && adjGovReq < 10.0 ? (adjPolReq - adjGovReq) * -0.25 : 0.0);

        // C. IMPACTO EM EXECUÇÃO DE POLÍTICAS
        // Se o suporte de Fin + Gov for baixo, sofre freio de arrasto. Se houver corte em Fin, puxa Pol para baixo.
        double suporteEstrutural = (efeitoFin + efeitoGov) / 2.0;
        double efeitoPol;

        if (adjPolReq < 0) {
            // Corte direto + agravante de corte orçamentário se houver
            efeitoPol = (adjPolReq + (efeitoFin < 0 ? efeitoFin * 0.20 : 0.0)) * mod.inerciaPol();
        } else if (adjPolReq > suporteEstrutural + 15.0) {
            // Teto operacional dinâmico (rendimento decrescente por falta de suporte)
            efeitoPol = (suporteEstrutural + 15.0 + ((adjPolReq - (suporteEstrutural + 15.0)) * 0.20)) * mod.inerciaPol();
            log.info("Ajuste de Políticas limitado de {}% para {}% por limitação de Financiamento/Governança.", adjPolReq, efeitoPol);
        } else {
            efeitoPol = adjPolReq * mod.inerciaPol();
        }

        // 2. APLICAR MULTIPLICADORES DE RENDIMENTO REALISTA
        double multFin = calcularFatorAjusteRealista(efeitoFin);
        double multGov = calcularFatorAjusteRealista(efeitoGov);
        double multPol = calcularFatorAjusteRealista(efeitoPol);

        // Projetar notas dos eixos em escala 0-100
        double scoreFinProjetado = Math.min(100.0, Math.max(0.0, baseFin100 * multFin));
        double scoreGovProjetado = Math.min(100.0, Math.max(0.0, baseGov100 * multGov));

        // Predição OLS normalizada (convertendo para 0-5 apenas durante o cálculo da equação de regressão)
        double scorePolCalculadoBase = betaCoefficientsPol[0]
                + (betaCoefficientsPol[1] * (scoreFinProjetado / 20.0))
                + (betaCoefficientsPol[2] * (scoreGovProjetado / 20.0));

        double polImpulsionado = scorePolCalculadoBase * 1.20;

        double scorePolProjetado = Math.min(100.0, Math.max(0.0, paraEscalaCem(polImpulsionado) * multPol));

        // 3. RESUMO EXECUTIVO
        double scoreGeralAtual = round((baseFin100 + baseGov100 + basePol100) / 3.0);
        double scoreGeralProjetado = round((scoreFinProjetado + scoreGovProjetado + scorePolProjetado) / 3.0);
        double varPct = round(((scoreGeralProjetado - scoreGeralAtual) / scoreGeralAtual) * 100.0);

        String statusGeral = varPct >= 5.0 ? "POSITIVO" : (varPct <= -5.0 ? "CRITICO" : "ALERTA");
        String mensagemDiagnostico = gerarMensagemDiagnostico(varPct, request);

        ResumoScoreResponse resumo = new ResumoScoreResponse(
                scoreGeralAtual, scoreGeralProjetado, varPct, statusGeral, mensagemDiagnostico
        );

        // 4. KPIS DOS EIXOS (Todos padronizados de 0 a 100)
        List<KpiEixoResponse> kpis = List.of(
                new KpiEixoResponse("FINANCIAMENTO", "Financiamento Climático", round(baseFin100), round(scoreFinProjetado), getTendencia(scoreFinProjetado, baseFin100), "#E53E3E"),
                new KpiEixoResponse("GOVERNANCA", "Governança & Transparência", round(baseGov100), round(scoreGovProjetado), getTendencia(scoreGovProjetado, baseGov100), "#DD6B20"),
                new KpiEixoResponse("POLITICAS_PUBLICAS", "Execução de Políticas Públicas", round(basePol100), round(scorePolProjetado), getTendencia(scorePolProjetado, basePol100), "#38A169")
        );

        // 5. SÉRIES TEMPORAIS (Interpolação do mandato)
        List<String> labelsAnos = List.of("2025 (Atual)", "2026 (Ano 1)", "2027 (Ano 2)", "2028 (Fim Mandato)");
        SeriesTemporaisResponse seriesTemporais = new SeriesTemporaisResponse(labelsAnos, List.of(
                new DataSetLinhaResponse("Financiamento", "#E53E3E", gerarInterpolacao(baseFin100, scoreFinProjetado)),
                new DataSetLinhaResponse("Governança", "#DD6B20", gerarInterpolacao(baseGov100, scoreGovProjetado)),
                new DataSetLinhaResponse("Políticas Públicas", "#38A169", gerarInterpolacao(basePol100, scorePolProjetado))
        ));

        // 6. LISTA DE TRADE-OFFS DINÂMICOS
        List<TradeOffResponse> tradeOffs = calcularTradeOffs(request, efeitoFin, efeitoGov, efeitoPol,tipoEntidadeStr);

        MetadadosResponse metadados = new MetadadosResponse(base.getEntityName(), base.getEntityType(), "2026-08-04");
        return new SimulacaoResponse(metadados, resumo, kpis, seriesTemporais, tradeOffs);
    }

    private List<TradeOffResponse> calcularTradeOffs( SimulacaoRequest req, double efeitoFin,  double efeitoGov,  double efeitoPol, String tipoEntidade) {

        List<TradeOffResponse> list = new ArrayList<>();

        // Regra específica para o Ente Federal em desaceleração de governança
        if ("FEDERAL".equalsIgnoreCase(tipoEntidade) && req.ajustePoliticas() > 30.0 && req.ajusteGovernanca() < 10.0) {
            list.add(new TradeOffResponse(
                TipoTradeOff.ALERTA,
                "Governança Federal",
                "Gargalo de Articulação Federativa",
                "Acelerar metas federais sem aporte equivalente em Governança gera entraves na repassagem de verbas para os estados/municípios e reduz a efetividade no território."
            ));
        }

        // 1. Alertar sobre perdas/déficit em Financiamento
        if (efeitoFin < 0) {
            list.add(new TradeOffResponse(
                TipoTradeOff.PERDA,
                "Financiamento",
                "Déficit Orçamentário / Perda de Repasses",
                "A redução na execução ou a falta de sustentabilidade fiscal gerou impacto negativo na saúde financeira e captação de recursos."
            ));
        }

        // 2. Alertar sobre gargalos em Governança
        if (efeitoGov < 0) {
            list.add(new TradeOffResponse(
                TipoTradeOff.ALERTA,
                "Governança",
                "Sobrecarga e Perda Institucional",
                "A aceleração de entregas sem controle ou a descontinuidade de programas comprometeu os mecanismos de transparência e auditoria."
            ));
        }

        // 3. Alertar sobre impacto em Políticas Públicas (Efeito Real ou Intenção de Corte)
        if (efeitoPol < 0 || req.ajustePoliticas() < -10.0) {
            list.add(new TradeOffResponse(
                TipoTradeOff.PERDA,
                "Políticas Públicas",
                "Descontinuidade de Programas Climáticos",
                "O corte na execução ou a falta de sustentabilidade orçamentária paralisa projetos essenciais e reduz a capacidade de resposta a eventos climáticos."
            ));
        }

        // 4. Recursos represados / incapacidade de execução
        if (req.ajusteFinanciamento() > 50.0 && req.ajustePoliticas() < 10.0) {
            list.add(new TradeOffResponse(
                TipoTradeOff.NEUTRO,
                "Financiamento",
                "Incapacidade de Absorção de Caixa",
                "Há excesso de recursos captados que não estão sendo convertidos em obras e serviços práticos no ritmo adequado."
            ));
        }

        // 5. Se nenhuma perda/alerta/gargalo foi registrado, a gestão é sustentável
        if (list.isEmpty()) {
            list.add(new TradeOffResponse(
                TipoTradeOff.GANHO,
                "Geral",
                "Sustentabilidade de Gestão",
                "A estratégia de investimento manteve o equilíbrio proporcional entre orçamento, governança e entregas."
            ));
        }

        return list;
    }

    private String getTendencia(double novo, double antigo) {
        if (novo > antigo + 0.1) return "ALTA";
        if (novo < antigo - 0.1) return "QUEDA";
        return "NEUTRO";
    }

    private List<Double> gerarInterpolacao(double inicio, double fim) {
        List<Double> lista = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            double val = inicio + (fim - inicio) * (i / 3.0);
            lista.add(round(val));
        }
        return lista;
    }

    private String gerarMensagemDiagnostico(double varPct, SimulacaoRequest req) {
        if (varPct > 0) return "A simulação projeta um ganho de " + round(varPct) + "% no índice de resposta climática para o mandato.";
        if (varPct < 0) return "Atenção: A configuração atual resulta em uma queda projetada de " + round(Math.abs(varPct)) + "% nos indicadores climáticos.";
        return "A simulação mantém o cenário atual de maturidade climática sem variações expressivas.";
    }

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    // Em vez de retornar 0.9 ou 4.5, normalize para 0 a 100:
    private double paraEscalaCem(double valorOriginal) {
        if (valorOriginal <= 0) return 0.0;

        // Se o seu CSV tem notas de 0 a 1 (ex: 0.84), multiplicamos por 100 direto:
        if (valorOriginal <= 1.0) {
            return Math.round(valorOriginal * 100.0 * 10.0) / 10.0; // 0.84 vira 84.0
        }

        // Se o seu CSV tem notas de 0 a 5 (ex: 0.84 em 5.0), multiplicamos por 200/5 para calibrar a régua:
        // Exemplo: 0.84 / 1.0 * 80.0 = 67.2
        double notaMinimaBase = 50.0; // Garante que nenhum município/estado comece zerado
        double notaMapeada = notaMinimaBase + (valorOriginal * 10.0); // Eleva a nota base para a faixa dos 60-80

        return Math.min(100.0, Math.round(notaMapeada * 10.0) / 10.0);
    }

    private double calcularFatorAjusteRealista(double percentualAjuste) {
        if (percentualAjuste == 0) return 1.0;

        // Se o percentual é positivo, aplicamos uma curva de rendimento decrescente,
        // mas com um fator de amplitude maior (ex: 0.008 em vez de 0.004)
        if (percentualAjuste > 0) {
            // Aumentando o multiplicador para dar mais impacto visual no topo
            return 1.0 + (Math.log1p(percentualAjuste / 100.0) * 0.85);
        } else {
            // Para reduções, garantimos que o impacto seja perceptível sem zerar tudo de cara
            return Math.max(0.1, 1.0 + (percentualAjuste / 100.0) * 0.75);
        }
    }

    private ModificadoresEntidade obterModificadoresEntidade(String tipoEntidade) {
        if (tipoEntidade == null) {
            return new ModificadoresEntidade(0.25, 1.0, 1.0);
        }

        return switch (tipoEntidade.toUpperCase()) {
            case "FEDERAL" -> new ModificadoresEntidade(
                    0.35, // Governança atrai mais fundos (maior capilaridade)
                    0.85, // Maior inércia para converter políticas em resultados imediatos
                    0.75  // Maior burocracia (retornos decrescentes mais acentuados)
            );
            case "ESTADUAL" -> new ModificadoresEntidade(0.28, 0.95, 0.90);
            case "MUNICIPAL" -> new ModificadoresEntidade(
                    0.20, // Menos atratividade de fundos globais diretos por governança
                    1.10, // Ação mais rápida no território (menor inércia)
                    1.00  // Execução direta
            );
            default -> new ModificadoresEntidade(0.25, 1.0, 1.0);
        };
    }
}