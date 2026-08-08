package com.climaton.climautils.dto.response;

import com.climaton.climautils.dto.FatorAlavancagem;
import com.climaton.climautils.dto.enums.MaturidadeRelativa;
import com.climaton.climautils.dto.enums.NivelRiscoOperacional;
import com.climaton.climautils.dto.enums.StatusAbsorcao;

public record ResumoScoreResponse(
    // KPI 1: Score Geral
    double scoreGeralAtual,
    double scoreGeralProjetado,
    double variacaoPercentual,
    String statusGeral,

    // KPI 2: Absorção Operacional
    double taxaAbsorcaoAbsorvida, // Ex: 82.0
    StatusAbsorcao statusAbsorcao,        // Ex: "MATURIDADE ALTA" ou "GARGALO DETECTADO"

    // KPI 3: Financiamento e ROI
    double roiClimaticoEstimado,  // Ex: 1.4
    FatorAlavancagem fatorAlavancagem,      // Ex: "Cada +10% gera +14% de impacto"

    // KPI 4: Alinhamento Federativo
    MaturidadeRelativa maturidadeRelativa,    // Ex: "ACIMA DA MEDIA ESTADUAL" ou "DENTRO DA MEDIA"

    // KPI 5: Risco Preditivo
    NivelRiscoOperacional nivelRiscoOperacional, // Ex: "BAIXO", "MEDIO", "ALERTA", "CRITICO"
    double riscoDescontinuidadePct, // Ex: 12.0 ou 68.0

    // Diagnóstico Textual
    String mensagemDiagnostico
) {}