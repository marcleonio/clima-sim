package com.climaton.climautils.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.Setter;

@Entity
@Table(name = "entity_scores")
@Getter
@Setter
@NoArgsConstructor
public class EntityScores {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double entityId;
    private String entityType; // "Estado", "Município", "Distrito Federal"
    private String entityName;
    private double scoreFinanciamento;
    private double scoreGovernanca;
    private double scorePoliticasPublicas;

    @ManyToOne
    @JoinColumn(name = "snapshot_id")
    @JsonIgnore
    private EvaluationSnapshot snapshot;

    public EntityScores(Double entityId, String entityType, String entityName,
                        double scoreFinanciamento, double scoreGovernanca, double scorePoliticasPublicas) {
        this.entityId = entityId;
        this.entityType = entityType;
        this.entityName = entityName;
        this.scoreFinanciamento = scoreFinanciamento;
        this.scoreGovernanca = scoreGovernanca;
        this.scorePoliticasPublicas = scorePoliticasPublicas;
    }

    public double getScoreGeralMedia() { return (scoreFinanciamento + scoreGovernanca + scorePoliticasPublicas) / 3.0; }

}