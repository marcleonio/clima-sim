package com.climaton.climautils.dto.response;

import java.util.List;

public record SeriesTemporaisResponse(
    List<String> labelsAnos,     // ["2025 (Atual)", "2026", "2027", "2028 (Fim Mandato)"]
    List<DataSetLinhaResponse> linhasGrafico
) {}
