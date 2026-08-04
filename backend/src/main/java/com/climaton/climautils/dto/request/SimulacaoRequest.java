package com.climaton.climautils.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

public record SimulacaoRequest(
    @Schema(description = "Dados para envio da simulação com percentuais de variação")
    String tipoEntidade,        // "Estado", "Município" ou "Federal"
    @Schema(description = "Nome do Estado ou Município", example = "Acre")
    String nomeEntidade,        // ex: "Acre", "Belo Horizonte"

    // Parâmetros dos Sliders do Front (-100 a +100 ou percentuais)
    @Schema(description = "Ajuste percentual no Financiamento Climático (-100 a +100)", example = "15.0")
    Double ajusteFinanciamento,  // ex: +15.0 (Aumentar 15% em captação/orçamento)
    @Schema(description = "Ajuste percentual na Governança & Transparência (-100 a +100)", example = "-5.0")
    Double ajusteGovernanca,     // ex: -5.0  (Reduzir 5% em transparência/conselhos)
    @Schema(description = "Ajuste percentual na Execução de Políticas Públicas (-100 a +100)", example = "20.0")
    Double ajustePoliticas       // ex: +20.0 (Aumentar 20% na execução de projetos)

    // double scoreFinanciamento,
    // Double scoreGovernanca
) {}
