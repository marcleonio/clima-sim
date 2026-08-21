package com.climaton.climautils.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.apache.commons.math3.stat.regression.OLSMultipleLinearRegression;
import org.springframework.stereotype.Service;

import com.climaton.climautils.dto.FatorAlavancagem;
import com.climaton.climautils.dto.ModificadoresEntidade;
import com.climaton.climautils.dto.enums.MaturidadeRelativa;
import com.climaton.climautils.dto.enums.NivelRiscoOperacional;
import com.climaton.climautils.dto.enums.StatusAbsorcao;
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
import com.climaton.climautils.service.external.DadosPublicosService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegressionEngineService {

    private final CsvLoaderService csvLoaderService;
    private final DadosPublicosService dadosPublicosService;
    private double[] betaCoefficientsPol; // Coeficientes da regressão

    @PostConstruct
    public void initDataAndTrainModel() {
        Map<String, EntityScores> data = csvLoaderService.loadAndAggregateCsv();
        if (!data.isEmpty()) {
            trainModel(entidadesReaisParaTreino(data));
        }
    }

    /**
     * Retreina o modelo OLS com o estado atual da base (chamado após o upload de um novo CSV,
     * já que este substitui os scores em memória usados como amostra de treino).
     */
    public void retrain() {
        Map<String, EntityScores> data = csvLoaderService.loadAndAggregateCsv();
        if (!data.isEmpty()) {
            trainModel(entidadesReaisParaTreino(data));
        }
    }

    /**
     * Remove do treino as agregações que não são governos reais e independentes:
     * "Estados consolidados"/"Municípios consolidados" (médias pré-calculadas da própria
     * base) e "Brasil" (média que este serviço calcula a partir dos próprios estados).
     * Incluí-las no OLS violaria a suposição de observações independentes e infla
     * artificialmente o "n" declarado do modelo.
     */
    private Collection<EntityScores> entidadesReaisParaTreino(Map<String, EntityScores> data) {
        return data.values().stream()
                .filter(e -> e.getEntityName() != null)
                .filter(e -> !e.getEntityName().toLowerCase().contains("consolidad"))
                .filter(e -> !"brasil".equalsIgnoreCase(e.getEntityName()))
                .toList();
    }

    private void trainModel(Collection<EntityScores> entities) {
        int n = entities.size();

        double[] y = new double[n];
        double[][] x = new double[n][2];

        int i = 0;
        for (EntityScores e : entities) {
            // Se o modelo espera os valores na faixa 0-5 ou 0-1 para os coeficientes:
            y[i] = e.getScorePoliticasPublicas() / 20.0;
            x[i][0] = e.getScoreFinanciamento() / 20.0;
            x[i][1] = e.getScoreGovernanca() / 20.0;
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
        String nomeSolicitado = request.nomeEntidade() != null ? request.nomeEntidade() : "Acre";
        String tipoSolicitado = request.tipoEntidade() != null ? request.tipoEntidade().name() : null;
        EntityScores base = csvLoaderService.buscarEntidade(tipoSolicitado, nomeSolicitado);
        if (base == null) {
            base = database.values().iterator().next();
        }

        // Capturar o tipo da entidade (seja do request ou da entidade carregada do banco)
        String tipoEntidadeStr = request.tipoEntidade() != null
                ? request.tipoEntidade().name()
                : base.getEntityType();

        ModificadoresEntidade mod = obterModificadoresEntidade(tipoEntidadeStr);

        // 0. Converter notas base para escala 0-100 utilizando a função padronizada
        double baseFin100 = base.getScoreFinanciamento();
        double baseGov100 = base.getScoreGovernanca();
        double basePol100 = base.getScorePoliticasPublicas();

        // Captura das solicitações do usuário (-100% a +100%)
        double adjFinReq = request.ajusteFinanciamento();
        double adjGovReq = request.ajusteGovernanca();
        double adjPolReq = request.ajustePoliticas();

        // 1. MATRIZ DE IMPACTOS CRUZADOS (SISTEMA BIDIRECIONAL REAIS)

        // A. IMPACTO EM FINANCIAMENTO
        // + Gov atrai fundos | - Pol perde repasses por inexecução | + Pol sem Fin gera déficit
        double efeitoFin = adjFinReq
                + (adjGovReq > 0 ? adjGovReq * mod.pesoGovFin() : adjGovReq * 0.50)
                + (adjPolReq < 0 ? adjPolReq * 0.40 : 0.0)
                + (adjPolReq > 10.0 && adjFinReq <= 0 ? adjPolReq * -0.30 : 0.0);

        // B. IMPACTO EM GOVERNANÇA
        // - Pol desacelera transparência/engajamento | + Pol sem Gov gera atropelo burocrático | - Fin corta equipe técnica
        double efeitoGov = adjGovReq
                + (adjFinReq < 0 ? adjFinReq * 0.45 : 0.0) // Corte financeiro afeta diretamente estruturas de controle
                + (adjPolReq < 0 ? adjPolReq * 0.20 : 0.0)
                + (adjPolReq > 20.0 && adjGovReq < 10.0 ? (adjPolReq - adjGovReq) * -0.25 : 0.0);

        // C. IMPACTO EM EXECUÇÃO DE POLÍTICAS
        // Se o suporte de Fin + Gov for baixo, sofre freio de arrasto. Se houver corte em Fin, puxa Pol para baixo.
        double suporteEstrutural = (efeitoFin + efeitoGov) / 2.0;
        double efeitoPol;

        // Penalidade direta de arrasto se Financiamento ou Governança caírem (mesmo que adjPolReq seja 0 ou positivo)
        double arrastoFinanceiro = efeitoFin < 0 ? efeitoFin * 0.70 : 0.0; // Corte no dinheiro seca projetos
        double arrastoBurocratico = efeitoGov < 0 ? efeitoGov * 0.35 : 0.0; // Queda na governança vaza/desperdiça recursos

        // Sinaliza quando a meta pedida pelo usuário para Políticas Públicas excede o que
        // Financiamento + Governança sustentam de forma realista - respondendo diretamente
        // "qual meta é incompatível com a capacidade atual?". Antes esse cálculo já existia
        // (o teto operacional abaixo), mas só ia parar num log.info() que ninguém via.
        boolean metaIncompativelComCapacidade = false;
        double tetoSustentavelPol = 0.0;

        if (adjPolReq < 0) {
            // Corte direto em políticas somado ao estrangulamento orçamentário/institucional
            efeitoPol = (adjPolReq + arrastoFinanceiro + arrastoBurocratico) * mod.inerciaPol();
        } else if (adjPolReq > suporteEstrutural + 15.0) {
            // Teto operacional dinâmico (rendimento decrescente por falta de suporte)
            tetoSustentavelPol = suporteEstrutural + 15.0;
            metaIncompativelComCapacidade = true;
            efeitoPol = (tetoSustentavelPol + ((adjPolReq - tetoSustentavelPol) * 0.20) + arrastoFinanceiro + arrastoBurocratico) * mod.inerciaPol();
            log.info("Ajuste de Políticas limitado para {}% por gargalo em Financiamento/Governança.", efeitoPol);
        } else {
            // Crescimento normal do usuário afetado por eventuais quedas em Financiamento/Governança
            efeitoPol = (adjPolReq + arrastoFinanceiro + arrastoBurocratico) * mod.inerciaPol();
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

        // KPI 2: Capacidade de Absorção
        double taxaAbsorcao = calcularTaxaAbsorcao(scoreGovProjetado, adjFinReq);
        StatusAbsorcao statusAbsorcao = taxaAbsorcao >= 75.0 ? StatusAbsorcao.MATURIDADE_ALTA : StatusAbsorcao.GARGALO_DETECTADO;

        // KPI 3: ROI e Alavancagem
        double roiClimatico = calcularRoiClimatico(scoreGovProjetado, scorePolProjetado, scoreFinProjetado);
        double impactoEstimado = round(roiClimatico * 10.0);
        FatorAlavancagem fatorAlavancagem = FatorAlavancagem.criar(impactoEstimado);

        // KPI 4: Maturidade Relativa x Ente Federativo
        MaturidadeRelativa maturidadeRelativa = calcularMaturidadeRelativa(scoreGeralProjetado, tipoEntidadeStr);

        // KPI 5: Risco Preditivo de Descontinuidade
        double riscoDescontinuidadePct = calcularRiscoDescontinuidade(adjPolReq, adjFinReq, scoreGovProjetado);
        NivelRiscoOperacional nivelRisco = determinarNivelRisco(riscoDescontinuidadePct, taxaAbsorcao);

        // Diagnóstico
        String mensagemDiagnostico = gerarMensagemDiagnostico(varPct, taxaAbsorcao,nivelRisco);

        ResumoScoreResponse resumo = new ResumoScoreResponse(
                scoreGeralAtual,
                scoreGeralProjetado,
                varPct,
                statusGeral,
                taxaAbsorcao,
                statusAbsorcao,
                roiClimatico,
                fatorAlavancagem,
                maturidadeRelativa,
                nivelRisco,
                riscoDescontinuidadePct,
                mensagemDiagnostico
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
        List<TradeOffResponse> tradeOffs = new ArrayList<>(calcularTradeOffs(request, efeitoFin, efeitoGov, efeitoPol, tipoEntidadeStr));

        if (metaIncompativelComCapacidade) {
            tradeOffs.add(0, new TradeOffResponse(
                    TipoTradeOff.ALERTA,
                    "Políticas Públicas",
                    "Meta Incompatível com a Capacidade Atual",
                    String.format(java.util.Locale.forLanguageTag("pt-BR"),
                            "Você pediu %+.1f%% em Políticas Públicas, mas o suporte atual de Financiamento e Governança sustenta, de forma realista, até %+.1f%%. "
                            + "Acima disso o retorno cai fortemente (rendimento decrescente): a meta anunciada não é alcançável sem reforçar Financiamento e/ou Governança antes.",
                            adjPolReq, tetoSustentavelPol)
            ));
        }

        // 7. CHECAGEM FACTUAL COM DADOS PÚBLICOS (SICONFI/IBGE) - aditivo e nunca bloqueante:
        // se as APIs externas falharem ou o dado não existir para o ente, simplesmente não entra.
        try {
            TradeOffResponse checagemFactual = dadosPublicosService.gerarChecagemFactual(base.getEntityId(), base.getEntityType());
            if (checagemFactual != null) {
                tradeOffs.add(checagemFactual);
            }
        } catch (Exception e) {
            log.warn("Checagem com dados públicos falhou de forma inesperada, seguindo sem esse item: {}", e.getMessage());
        }

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

    /**
     * Calcula quanto do financiamento a estrutura de governança consegue absorver.
     * Quanto maior a governança, maior a capacidade de execução orçamentária.
     */
    private double calcularTaxaAbsorcao(double scoreGovProjetado, double ajusteFinanciamentoReq) {
        // Base de absorção guiada pelo nível de governança (0 a 100)
        double absorcaoBase = 50.0 + (scoreGovProjetado * 0.45); // Varia aproximadamente de 50% a 95%

        // Penalidade se o usuário exigir uma injeção de verba rápida (+Financiamento) sem Governança proporcional
        if (ajusteFinanciamentoReq > 30.0 && scoreGovProjetado < 60.0) {
            double estresseBurocratico = (ajusteFinanciamentoReq - 30.0) * 0.3;
            absorcaoBase -= estresseBurocratico;
        }

        return round(Math.min(98.0, Math.max(30.0, absorcaoBase)));
    }

    /**
     * Calcula o retorno climático projetado (ROI).
     * Relaciona a eficiência da entrega de políticas públicas e governança com o financiamento.
     */
    private double calcularRoiClimatico(double gov, double pol, double fin) {
        if (fin <= 0) return 1.0;

        // O ROI é maximizado quando Governança e Execução de Políticas acompanham o Financiamento
        double eficienciamedia = (gov + pol) / 2.0;
        double roiCalculado = (eficienciamedia / fin) * 1.25;

        // Limita o ROI em uma faixa realista entre 0.5x e 2.8x
        return round(Math.min(2.8, Math.max(0.5, roiCalculado)));
    }

    private MaturidadeRelativa calcularMaturidadeRelativa(double scoreGeralProjetado, String tipoEntidade) {
        double mediaReferencia = "FEDERAL".equalsIgnoreCase(tipoEntidade) ? 70.0 : 55.0;
        
        if (scoreGeralProjetado > mediaReferencia + 8.0) {
            return MaturidadeRelativa.ACIMA_DA_MEDIA;
        } else if (scoreGeralProjetado < mediaReferencia - 8.0) {
            return MaturidadeRelativa.ABAIXO_DA_MEDIA;
        }
        return MaturidadeRelativa.DENTRO_DA_MEDIA;
    }

    private double calcularRiscoDescontinuidade(double adjPol, double adjFin, double gov) {
        double riscoBase = 15.0; // Risco residual natural de gestão

        // Se houver corte em políticas públicas, o risco dispara
        if (adjPol < 0) {
            riscoBase += Math.abs(adjPol) * 1.2;
        }
        // Se houver corte financeiro, também afeta a continuidade
        if (adjFin < 0) {
            riscoBase += Math.abs(adjFin) * 0.8;
        }
        // Baixa governança aumenta a chance de paralisia de programas
        if (gov < 50.0) {
            riscoBase += (50.0 - gov) * 0.5;
        }

        return round(Math.min(95.0, Math.max(5.0, riscoBase)));
    }

    /**
     * Determina o nível de risco de execução com base no estresse entre aporte x absorção.
     */
    private NivelRiscoOperacional determinarNivelRisco(double riscoDescontinuidadePct, double taxaAbsorcao) {
        if (riscoDescontinuidadePct > 60.0 || taxaAbsorcao < 45.0) {
            return NivelRiscoOperacional.CRITICO;
        }
        if (riscoDescontinuidadePct > 35.0 || taxaAbsorcao < 65.0) {
            return NivelRiscoOperacional.ALERTA;
        }
        if (riscoDescontinuidadePct > 20.0) {
            return NivelRiscoOperacional.MEDIO;
        }
        return NivelRiscoOperacional.BAIXO;
    }

    

    /**
     * Sobrecarga de diagnóstico enriquecida com insights sobre absorção e risco.
     */
    private String gerarMensagemDiagnostico(double varPct, double taxaAbsorcao, NivelRiscoOperacional nivelRisco) {
        StringBuilder sb = new StringBuilder();

        if (varPct > 0) {
            sb.append(String.format("A simulação projeta um ganho de %.1f%% no índice climático. ", varPct));
        } else if (varPct < 0) {
            sb.append(String.format("Atenção: A simulação indica uma queda de %.1f%% no indicador geral. ", Math.abs(varPct)));
        } else {
            sb.append("A simulação mantém a maturidade climática estável. ");
        }

        if (NivelRiscoOperacional.CRITICO.equals(nivelRisco) || NivelRiscoOperacional.ALERTA.equals(nivelRisco)) {
            sb.append(String.format("Gargalo detectado: Taxa de absorção de apenas %.1f%% devido à baixa governança.", taxaAbsorcao));
        } else {
            sb.append(String.format("Capacidade de absorção orçamentária satisfatória (%.1f%%).", taxaAbsorcao));
        }

        return sb.toString();
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

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

   /**
     * Converte valores base do CSV (seja em escala 0-1.0 ou 0-5.0) para a escala percentual 0-100.
     */
    private double paraEscalaCem(double valorOriginal) {
        if (valorOriginal <= 0) return 0.0;

        double valorConvertido;
        if (valorOriginal <= 1.0) {
            // Escala de 0.0 a 1.0 (ex: 0.84 -> 84.0)
            valorConvertido = valorOriginal * 100.0;
        } else if (valorOriginal <= 5.0) {
            // Escala de 0.0 a 5.0 (ex: 4.2 -> 84.0)
            valorConvertido = (valorOriginal / 5.0) * 100.0;
        } else {
            // Já está em escala 0-100
            valorConvertido = valorOriginal;
        }

        return Math.min(100.0, Math.round(valorConvertido * 10.0) / 10.0);
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