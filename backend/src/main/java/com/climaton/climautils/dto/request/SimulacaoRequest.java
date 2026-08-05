package com.climaton.climautils.dto.request;

import com.climaton.climautils.dto.enums.TipoEntidade;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Payload para execução de simulação com percentuais de variação por eitxo")
public record SimulacaoRequest(

    @Schema(
        description = "Esfera ou nível da entidade (Federal, Estadual ou Municipal)",
        example = "Estadual",
        implementation = TipoEntidade.class
    )
    TipoEntidade tipoEntidade,

    @Schema(
        description = "Nome do Estado ou Município. Para entidade Federal, pode enviar 'Brasil' ou o nome do órgão",
        example = "Acre"
    )
    String nomeEntidade,

    @Schema(
        description = "Ajuste percentual no Financiamento Climático",
        example = "15.0",
        minimum = "-100.0",
        maximum = "100.0"
    )
    Double ajusteFinanciamento,

    @Schema(
        description = "Ajuste percentual na Governança & Transparência",
        example = "-5.0",
        minimum = "-100.0",
        maximum = "100.0"
    )
    Double ajusteGovernanca,

    @Schema(
        description = "Ajuste percentual na Execução de Políticas Públicas",
        example = "20.0",
        minimum = "-100.0",
        maximum = "100.0"
    )
    Double ajustePoliticas

) {}