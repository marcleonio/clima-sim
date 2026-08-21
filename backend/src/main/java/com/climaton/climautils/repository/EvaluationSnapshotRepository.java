package com.climaton.climautils.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;

import com.climaton.climautils.model.EvaluationSnapshot;

public interface EvaluationSnapshotRepository extends JpaRepository<EvaluationSnapshot, Long> {
    boolean existsByDataAvaliacaoAndVersao(LocalDateTime dataAvaliacao, String versao);
}
