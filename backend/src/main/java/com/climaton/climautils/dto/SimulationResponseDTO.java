package com.climaton.climautils.dto;

public record SimulationResponseDTO(
        double scoreFinanciamento,
        double scoreGovernanca,
        double scorePoliticasPublicasProjetado
) {}