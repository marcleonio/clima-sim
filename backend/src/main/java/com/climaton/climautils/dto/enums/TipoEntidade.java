package com.climaton.climautils.dto.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TipoEntidade {
    FEDERAL("Federal"),
    ESTADUAL("Estadual"),
    MUNICIPAL("Municipal");

    private final String descricao;

    TipoEntidade(String descricao) {
        this.descricao = descricao;
    }

    @JsonValue
    public String getDescricao() {
        return descricao;
    }

    @JsonCreator
    public static TipoEntidade fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (TipoEntidade tipo : TipoEntidade.values()) {
            if (tipo.name().equalsIgnoreCase(value) || tipo.getDescricao().equalsIgnoreCase(value)) {
                return tipo;
            }
        }
        throw new IllegalArgumentException("Tipo de entidade inválido: " + value);
    }
}