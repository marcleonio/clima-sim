package com.climaton.climautils.dto.response;

public record ResumoScoreResponse(
    Double scoreGeralAtual,
    Double scoreGeralProjetado,
    Double variacaoPercentual,
    String statusGeral,          // "POSITIVO", "ALERTA", "CRITICO"
    String mensagemDiagnostico   // Frase curta para exibir no banner principal do dash
) {}
