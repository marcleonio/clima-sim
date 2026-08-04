package com.climaton.climautils.service;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.climaton.climautils.model.EntityScores;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class CsvLoaderService {

    private final Map<String, EntityScores> databaseEmMemoria = new HashMap<>();

    public Map<String, EntityScores> loadAndAggregateCsv() {
        if (!databaseEmMemoria.isEmpty()) {
            return databaseEmMemoria;
        }

        try {
            Map<String, List<CSVRecord>> agrupado = lerEAgruparRecords();
            processarGrupos(agrupado);
            log.info(">>> CSV do Painel ClimaBrasil carregado com sucesso! Total de entidades: " + databaseEmMemoria.size());
        } catch (Exception e) {
            log.error("Erro ao carregar o CSV: " + e.getMessage());
        }

        return databaseEmMemoria;
    }

    private Map<String, List<CSVRecord>> lerEAgruparRecords() throws Exception {
        ClassPathResource resource = new ClassPathResource("pcb-raw-data.csv");
        Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8);

        CSVParser csvParser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .get()
                .parse(reader);

        Map<String, List<CSVRecord>> agrupado = new HashMap<>();
        for (CSVRecord csvRecord : csvParser) {
            String key = csvRecord.get("entity_type") + ":" + csvRecord.get("entity_name");
            agrupado.computeIfAbsent(key, k -> new ArrayList<>()).add(csvRecord);
        }
        return agrupado;
    }

    private void processarGrupos(Map<String, List<CSVRecord>> agrupado) {
        for (List<CSVRecord> records : agrupado.values()) {
            if (records.isEmpty()) continue;

            String entityType = records.get(0).get("entity_type");
            String entityName = records.get(0).get("entity_name");
            Double entityId = parseDoubleOrZero(records.get(0).get("entity_id"));

            EntityScores scores = calcularScoreEntidade(entityId, entityType, entityName, records);
            databaseEmMemoria.put(entityName.toLowerCase(), scores);
        }
    }

    private EntityScores calcularScoreEntidade(Double entityId, String entityType, String entityName, List<CSVRecord> records) {
        double sumFin = 0; int countFin = 0;
        double sumGov = 0; int countGov = 0;
        double sumPol = 0; int countPol = 0;

        for (CSVRecord r : records) {
            String axis = r.get("axis_name");
            double score = parseDoubleOrZero(r.get("score_value"));

            if (score <= 0) continue;

            if ("Financiamento".equalsIgnoreCase(axis)) {
                sumFin += score; countFin++;
            } else if ("Governança".equalsIgnoreCase(axis)) {
                sumGov += score; countGov++;
            } else if ("Políticas públicas".equalsIgnoreCase(axis)) {
                sumPol += score; countPol++;
            }
        }

        double avgFin = countFin > 0 ? sumFin / countFin : 2.5;
        double avgGov = countGov > 0 ? sumGov / countGov : 2.5;
        double avgPol = countPol > 0 ? sumPol / countPol : 2.5;

        return new EntityScores(entityId, entityType, entityName, avgFin, avgGov, avgPol);
    }

    private double parseDoubleOrZero(String val) {
        if (val == null || val.isBlank()) return 0.0;
        try {
            return Double.parseDouble(val.trim());
        } catch (Exception e) {
            return 0.0;
        }
    }
}