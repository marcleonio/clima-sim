package com.climaton.climautils.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resultado do upload de um novo CSV de avaliação (ex.: um novo ano do Painel ClimaBrasil):
 * resumo do que foi importado e a comparação, entidade a entidade, com o estado anterior
 * ao upload - a base para o gráfico de evolução em /api/reports/evolution.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CsvUploadResultDTO {
    private LocalDateTime dataAvaliacao;
    private String versao;
    private int totalEntidadesProcessadas;
    private int entidadesNovas;
    private int entidadesComparadas;
    private double variacaoMediaFinanciamento;
    private double variacaoMediaGovernanca;
    private double variacaoMediaPoliticas;
    private List<ComparacaoEntidadeDTO> maioresVariacoes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComparacaoEntidadeDTO {
        private String entityType;
        private String entityName;
        private double scoreAnteriorGeral;
        private double scoreNovoGeral;
        private double variacao;
    }
}
