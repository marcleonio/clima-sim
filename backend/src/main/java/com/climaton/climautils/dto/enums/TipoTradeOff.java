package com.climaton.climautils.dto.enums;

import lombok.Getter;

@Getter
public enum TipoTradeOff {
    GANHO("GANHO", "#38A169"),
    PERDA("PERDA", "#E53E3E"),
    ALERTA("ALERTA", "#DD6B20"),
    NEUTRO("NEUTRO", "#718096");

    private final String codigo;
    private final String corHex;

    TipoTradeOff(String codigo, String corHex) {
        this.codigo = codigo;
        this.corHex = corHex;
    }
}
