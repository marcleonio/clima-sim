package com.climaton.climautils.dto.response;

/**
 * Um item de avaliação individual do Painel ClimaBrasil (ex.: "F1.A"), com o
 * comentário original do auditor que justifica a nota - a evidência/documento
 * por trás do diagnóstico, hoje descartada pelo CsvLoaderService ao calcular
 * apenas a média numérica de cada eixo.
 */
public record EvidenciaItemResponse(
    String eixo,               // "Financiamento", "Governança", "Políticas públicas"
    String componente,         // "F1", "G3"...
    String item,                // "A", "B"...
    String notaTexto,          // "Estágio avançado", "Sem progresso"...
    String dataAvaliacao,
    String comentario
) {}
