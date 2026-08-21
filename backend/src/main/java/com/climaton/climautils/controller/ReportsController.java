package com.climaton.climautils.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.climaton.climautils.dto.response.CsvUploadResultDTO;
import com.climaton.climautils.dto.response.EvolutionChartDTO;
import com.climaton.climautils.service.CsvLoaderService;
import com.climaton.climautils.service.EvolutionReportService;
import com.climaton.climautils.service.RegressionEngineService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Tag(name = "Relatórios", description = "Evolução histórica dos scores e importação de novas avaliações (CSV)")
public class ReportsController {

    private final EvolutionReportService evolutionReportService;
    private final CsvLoaderService csvLoaderService;
    private final RegressionEngineService regressionEngineService;

    @GetMapping("/evolution")
    public ResponseEntity<EvolutionChartDTO> getEvolution(@RequestParam Double entityId) {
        return ResponseEntity.ok(evolutionReportService.getEvolutionByEntityId(entityId));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Importar novo CSV de avaliação",
        description = "Recebe um CSV no formato do Painel ClimaBrasil (ex.: a avaliação de um novo ano), calcula os "
                + "scores agregados por entidade, compara com o estado atual, retreina o modelo de regressão e "
                + "grava um novo snapshot no histórico - passando a alimentar o gráfico de evolução (/evolution)."
    )
    public ResponseEntity<CsvUploadResultDTO> uploadCsv(
            @Parameter(description = "Arquivo .csv no formato do Painel ClimaBrasil") @RequestParam("file") MultipartFile file) {
        try {
            CsvUploadResultDTO resultado = csvLoaderService.processarUpload(file);
            regressionEngineService.retrain();
            return ResponseEntity.ok(resultado);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage(), e);
        } catch (Exception e) {
            log.error("Falha ao processar upload de CSV", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao processar o CSV enviado.", e);
        }
    }
}
