package com.climaton.climautils.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.climaton.climautils.model.EntityScores;

public interface EntityScoresRepository extends JpaRepository<EntityScores, Long> {

    @Query("""
            SELECT es
            FROM EntityScores es
            JOIN FETCH es.snapshot s
            WHERE es.entityId = :entityId
            ORDER BY s.dataAvaliacao ASC
            """)
    List<EntityScores> findHistoryByEntityId(@Param("entityId") Double entityId);
}
