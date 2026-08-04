package com.climaton.climautils.dto.response;

import java.util.List;

public record DataSetLinhaResponse(
    String nomeLinha,            // "Financiamento", "Governança", "Políticas Públicas"
    String corLinhaHex,
    List<Double> valoresAnoAAno
) {}
