package com.climaton.climautils.service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.climaton.climautils.dto.response.EvolutionChartDTO;
import com.climaton.climautils.model.EntityScores;
import com.climaton.climautils.repository.EntityScoresRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EvolutionReportService {

    private static final DateTimeFormatter DATE_LABEL_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.forLanguageTag("pt-BR"));

    private final EntityScoresRepository entityScoresRepository;
    private final CsvLoaderService csvLoaderService;

    public EvolutionChartDTO getEvolutionByEntityId(Double entityId) {
        csvLoaderService.loadAndAggregateCsv();

        List<EntityScores> historico = entityScoresRepository.findHistoryByEntityId(entityId);

        List<String> labels = new ArrayList<>();
        List<Double> dadosFinanciamento = new ArrayList<>();
        List<Double> dadosGovernanca = new ArrayList<>();
        List<Double> dadosPoliticas = new ArrayList<>();

        for (EntityScores score : historico) {
            labels.add(score.getSnapshot().getDataAvaliacao().format(DATE_LABEL_FORMATTER));
            dadosFinanciamento.add(score.getScoreFinanciamento());
            dadosGovernanca.add(score.getScoreGovernanca());
            dadosPoliticas.add(score.getScorePoliticasPublicas());
        }

        List<EvolutionChartDTO.DataSetDTO> datasets = List.of(
                new EvolutionChartDTO.DataSetDTO("Financiamento", dadosFinanciamento),
                new EvolutionChartDTO.DataSetDTO("Governança", dadosGovernanca),
                new EvolutionChartDTO.DataSetDTO("Políticas Públicas", dadosPoliticas)
        );

        return new EvolutionChartDTO(labels, datasets);
    }
}
