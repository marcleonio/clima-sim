package com.climaton.climautils.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvolutionChartDTO {
    private List<String> labels;
    private List<DataSetDTO> datasets;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataSetDTO {
        private String label;
        private List<Double> data;
    }
}
