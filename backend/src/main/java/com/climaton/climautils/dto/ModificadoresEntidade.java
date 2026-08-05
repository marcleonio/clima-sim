package com.climaton.climautils.dto;

public record ModificadoresEntidade (
    double pesoGovFin,     // O quanto governança atrai financiamento
    double inerciaPol,     // Coeficiente de inércia/fator de escala na execução de políticas
    double atritoBurocratico // Fator de amortecimento em ajustes muito agressivos
) {}
