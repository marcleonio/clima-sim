package com.climaton.climautils.dto.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MaturidadeRelativa {
    ACIMA_DA_MEDIA("ACIMA DA MÉDIA"),
    DENTRO_DA_MEDIA("DENTRO DA MÉDIA"),
    ABAIXO_DA_MEDIA("ABAIXO DA MÉDIA");

    private final String descricao;
}