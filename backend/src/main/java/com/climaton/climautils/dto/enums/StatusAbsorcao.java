package com.climaton.climautils.dto.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StatusAbsorcao {
    MATURIDADE_ALTA("MATURIDADE ALTA", "Capacidade plena de converter orçamentos em entregas"),
    GARGALO_DETECTADO("GARGALO DETECTADO", "Risco de recursos represados por limitações operacionais");

    private final String descricao;
    private final String detalhe;
}