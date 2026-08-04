package com.climaton.climautils.dto.response;

import java.util.List;

public record SimulacaoResponse(
    MetadadosResponse metadados,
    ResumoScoreResponse resumo,
    List<KpiEixoResponse> kpisEixos,
    SeriesTemporaisResponse seriesTemporais,
    List<TradeOffResponse> listaTradeOffs
) {}
