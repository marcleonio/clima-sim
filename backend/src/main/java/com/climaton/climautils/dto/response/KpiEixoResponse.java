package com.climaton.climautils.dto.response;

public record KpiEixoResponse(
    String chaveEixo,            // "FINANCIAMENTO", "GOVERNANCA", "POLITICAS_PUBLICAS"
    String nomeExibicao,         // "Financiamento Climático", etc.
    Double scoreAtual,
    Double scoreProjetado,
    String tendencia,            // "ALTA", "QUEDA", "NEUTRO"
    String corSugestaoHex        // "#38A169" (verde), "#E53E3E" (vermelho), "#DD6B20" (amarelo)
) {}