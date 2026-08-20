package com.climaton.climautils.controller;

import com.climaton.climautils.dto.request.SimulacaoRequest;
import com.climaton.climautils.dto.response.EvidenciaItemResponse;
import com.climaton.climautils.dto.response.SimulacaoResponse;
import com.climaton.climautils.model.EntityScores;
import com.climaton.climautils.service.CsvLoaderService;
import com.climaton.climautils.service.RegressionEngineService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/simulacao")
@CrossOrigin(origins = "*") // Permite chamadas do seu front em localhost
@RequiredArgsConstructor
@Tag(name = "Simulação Climática", description = "Endpoints para recálculo de projeções dos 4 anos de mandato")
public class SimulacaoController {

    private final RegressionEngineService regressionEngineService;
    private final CsvLoaderService csvLoaderService;

    @GetMapping("/entidades")
    @Operation(summary = "Listar Entidades e Scores Base", description = "Retorna todos os estados e municípios com as notas atuais do CSV.")
    public ResponseEntity<Map<String, EntityScores>> listarEntidades() {
        return ResponseEntity.ok(csvLoaderService.loadAndAggregateCsv());
    }

    @GetMapping("/evidencias")
    @Operation(
        summary = "Listar Evidências de uma Entidade",
        description = "Retorna os comentários originais dos auditores por trás de cada item avaliado (a evidência/documento que justifica a nota), para consulta e auditoria."
    )
    public ResponseEntity<List<EvidenciaItemResponse>> listarEvidencias(
            @Parameter(description = "Esfera da entidade (Federal, Estadual ou Municipal)") @RequestParam(required = false) String tipoEntidade,
            @Parameter(description = "Nome do Estado, Município ou 'Brasil'") @RequestParam String nomeEntidade) {
        return ResponseEntity.ok(csvLoaderService.buscarEvidencias(tipoEntidade, nomeEntidade));
    }

    @PostMapping("/recalculate")
    @Operation(
        summary = "Recalcular Projeções e Trade-offs",
        description = "Recebe os ajustes percentuais dos eixos e aplica o modelo de regressão para simular os 4 anos de mandato."
    )
    @ApiResponse(responseCode = "200", description = "Simulação calculada com sucesso")
    @ApiResponse(responseCode = "400", description = "Parâmetros de simulação inválidos")
    public ResponseEntity<SimulacaoResponse> recalcular(@RequestBody SimulacaoRequest request) {
        SimulacaoResponse response = regressionEngineService.executarSimulacao(request);
        return ResponseEntity.ok(response);
    }
}