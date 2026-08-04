package com.climaton.climautils.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class EntityScores {
    private Double entityId;
    private String entityType; // "Estado", "Município", "Distrito Federal"
    private String entityName;
    private double scoreFinanciamento;
    private double scoreGovernanca;
    private double scorePoliticasPublicas;

    public double getScoreGeralMedia() { return (scoreFinanciamento + scoreGovernanca + scorePoliticasPublicas) / 3.0; }

}