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

import com.climaton.climautils.dto.response.EvidenciaItemResponse;
import com.climaton.climautils.model.EntityScores;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class CsvLoaderService {

    private final Map<String, EntityScores> databaseEmMemoria = new HashMap<>();
    private final Map<String, List<EvidenciaItemResponse>> evidenciasEmMemoria = new HashMap<>();

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
        List<EntityScores> todosOsEstados = new ArrayList<>();

        for (List<CSVRecord> records : agrupado.values()) {
            if (records.isEmpty()) continue;

            String entityType = records.get(0).get("entity_type");
            String entityName = records.get(0).get("entity_name");
            Double entityId = parseDoubleOrZero(records.get(0).get("entity_id"));

            EntityScores scores = calcularScoreEntidade(entityId, entityType, entityName, records);

            // Chave composta (esfera + nome) em vez de só o nome: "Rio de Janeiro" e "São Paulo"
            // existem tanto como Estado quanto como Município no CSV, com o mesmo entity_name.
            // Usar só o nome como chave faz um sobrescrever o outro no mapa (perda silenciosa de dado).
            String chave = chaveEntidade(entityType, entityName);
            databaseEmMemoria.put(chave, scores);
            evidenciasEmMemoria.put(chave, extrairEvidencias(records));

            // Coletar apenas Estados REAIS (excluir agregações prévias como "Estados consolidados")
            // para calcular a agregação Federal como média dos 26 UFs + DF
            if ("Estado".equalsIgnoreCase(entityType)
                && !"Estados consolidados".equalsIgnoreCase(entityName)) {
                todosOsEstados.add(scores);
            }
        }

        // Criar agregação Federal calculando a média ponderada de todos os Estados
        // Representa o cenário climático nacional como consolidação dos governos subnacionais
        if (!todosOsEstados.isEmpty()) {
            EntityScores scoreFederal = calcularScoreFederal(todosOsEstados);
            databaseEmMemoria.put(chaveEntidade("Federal", "Brasil"), scoreFederal);
            log.info(">>> Agregação Federal (Brasil) calculada com {} estados. Scores: Financiamento={}, Governança={}, Políticas={}",
                    todosOsEstados.size(),
                    String.format("%.2f", scoreFederal.getScoreFinanciamento()),
                    String.format("%.2f", scoreFederal.getScoreGovernanca()),
                    String.format("%.2f", scoreFederal.getScorePoliticasPublicas()));
        }
    }

    /**
     * Busca uma entidade pelo nome, desambiguando por esfera quando informada.
     * Necessário porque "Rio de Janeiro" e "São Paulo" existem simultaneamente
     * como Estado e como Município na base — buscar só pelo nome é ambíguo.
     *
     * @param tipoEntidadeBruto esfera vinda do request (aceita tanto o vocabulário do
     *                          request - Federal/Estadual/Municipal - quanto o do CSV -
     *                          Estado/Município/Distrito Federal). Pode ser nulo.
     * @param nomeEntidade nome da entidade (obrigatório)
     */
    public EntityScores buscarEntidade(String tipoEntidadeBruto, String nomeEntidade) {
        if (nomeEntidade == null || nomeEntidade.isBlank()) return null;
        String nomeChave = nomeEntidade.trim().toLowerCase();

        if (tipoEntidadeBruto != null && !tipoEntidadeBruto.isBlank()) {
            EntityScores exato = databaseEmMemoria.get(normalizarEsfera(tipoEntidadeBruto) + "|" + nomeChave);
            if (exato != null) return exato;
        }

        // Sem esfera informada (ou não encontrada nela): procura em qualquer esfera,
        // preferindo Estado/Distrito Federal/Federal sobre Município em caso de ambiguidade
        // (mantém o comportamento histórico do endpoint, que não exigia o tipo).
        EntityScores candidatoMunicipal = null;
        for (Map.Entry<String, EntityScores> entry : databaseEmMemoria.entrySet()) {
            if (!entry.getKey().endsWith("|" + nomeChave)) continue;
            if (entry.getKey().startsWith("municipal|")) {
                candidatoMunicipal = entry.getValue();
            } else {
                return entry.getValue();
            }
        }
        return candidatoMunicipal;
    }

    /**
     * Busca as evidências (comentários originais dos auditores) por trás dos scores
     * de uma entidade, na mesma esfera desambiguada usada em {@link #buscarEntidade}.
     * Retorna lista vazia (nunca nulo) quando não há evidências ou a entidade não existe.
     */
    public List<EvidenciaItemResponse> buscarEvidencias(String tipoEntidadeBruto, String nomeEntidade) {
        if (nomeEntidade == null || nomeEntidade.isBlank()) return List.of();
        String nomeChave = nomeEntidade.trim().toLowerCase();

        if (tipoEntidadeBruto != null && !tipoEntidadeBruto.isBlank()) {
            List<EvidenciaItemResponse> exato = evidenciasEmMemoria.get(normalizarEsfera(tipoEntidadeBruto) + "|" + nomeChave);
            if (exato != null) return exato;
        }

        for (Map.Entry<String, List<EvidenciaItemResponse>> entry : evidenciasEmMemoria.entrySet()) {
            if (entry.getKey().endsWith("|" + nomeChave)) return entry.getValue();
        }
        return List.of();
    }

    /**
     * Extrai, de cada item de avaliação (linha do CSV) de uma entidade, o comentário
     * original do auditor - a evidência/documento que justifica a nota. Descartado até
     * aqui pelo cálculo do score agregado, que só olha axis_name e score_value.
     */
    private List<EvidenciaItemResponse> extrairEvidencias(List<CSVRecord> records) {
        List<EvidenciaItemResponse> evidencias = new ArrayList<>();
        for (CSVRecord r : records) {
            String comentario = r.get("assessment_comment");
            if (comentario == null || comentario.isBlank()) continue;

            evidencias.add(new EvidenciaItemResponse(
                    r.get("axis_name"),
                    r.get("component_identifier"),
                    r.get("item_identifier"),
                    r.get("score_text"),
                    r.get("assessment_completion_dt"),
                    comentario.trim()
            ));
        }
        return evidencias;
    }

    private String chaveEntidade(String tipoEntidade, String nomeEntidade) {
        return normalizarEsfera(tipoEntidade) + "|" + nomeEntidade.trim().toLowerCase();
    }

    /**
     * Normaliza os vários vocabulários de esfera vistos na base e no request
     * (Estado/Município/Distrito Federal do CSV; Federal/Estadual/Municipal do request)
     * para 3 baldes estáveis. Distrito Federal cai no balde "estadual", espelhando
     * a convenção já usada no frontend (normalizarTipoEntidade em clima-api.ts).
     */
    private String normalizarEsfera(String tipoBruto) {
        String t = tipoBruto.trim().toUpperCase();
        if (t.startsWith("MUNIC")) return "municipal";
        if (t.startsWith("FED")) return "federal";
        return "estadual";
    }
    
    /**
     * Calcula o score federal agregando os scores de todos os estados.
     * Usa média aritmética simples, podendo evoluir para média ponderada por população.
     * 
     * @param estados Lista de EntityScores dos estados individuais
     * @return EntityScores com tipo "Federal" e nome "Brasil", representando o cenário nacional
     */
    private EntityScores calcularScoreFederal(List<EntityScores> estados) {
        double avgFin = 0, avgGov = 0, avgPol = 0;
        
        for (EntityScores e : estados) {
            avgFin += e.getScoreFinanciamento();
            avgGov += e.getScoreGovernanca();
            avgPol += e.getScorePoliticasPublicas();
        }
        
        int qtd = estados.size();
        return new EntityScores(
            0.0,
            "Federal",
            "Brasil",
            avgFin / qtd,
            avgGov / qtd,
            avgPol / qtd
        );
    }

    private EntityScores calcularScoreEntidade(Double entityId, String entityType, String entityName, List<CSVRecord> records) {
        double sumFin = 0; int countFin = 0;
        double sumGov = 0; int countGov = 0;
        double sumPol = 0; int countPol = 0;

        for (CSVRecord r : records) {
            String axis = r.get("axis_name");
            String scoreStr = r.get("score_value");
            String scoreText = r.get("score_text"); // Pegamos o texto para validar o "Sem progresso"

            double score = 0.0;

            // Lógica de extração segura da nota
            if (scoreStr != null && !scoreStr.isBlank()) {
                try {
                    score = Double.parseDouble(scoreStr.trim());
                } catch (NumberFormatException e) {
                    continue; // Pula se houver lixo não numérico (ex: "N/A")
                }
            } else if ("Sem progresso".equalsIgnoreCase(scoreText)) {
                // Se o valor está vazio, mas o texto diz "Sem progresso", a nota é zero garantida!
                score = 0.0;
            } else {
                // Se está vazio e não tem o texto indicando falta de progresso, é falta de dado. Pula.
                continue;
            }

            // Somatória e contagem (agora os zeros vão passar por aqui e aumentar o divisor!)
            if ("Financiamento".equalsIgnoreCase(axis)) {
                sumFin += score; countFin++;
            } else if ("Governança".equalsIgnoreCase(axis)) {
                sumGov += score; countGov++;
            } else if ("Políticas públicas".equalsIgnoreCase(axis)) {
                sumPol += score; countPol++;
            }
        }

        // Calcula a média. Se não houver nenhum dado computado (count == 0), você pode decidir o default (ex: 0.0)
        double avgFin = countFin > 0 ? sumFin / countFin : 0.0; 
        double avgGov = countGov > 0 ? sumGov / countGov : 0.0;
        double avgPol = countPol > 0 ? sumPol / countPol : 0.0;

        double normFin = normalizarPara100(avgFin);
        double normGov = normalizarPara100(avgGov);
        double normPol = normalizarPara100(avgPol);

        return new EntityScores(entityId, entityType, entityName, normFin, normGov, normPol);
    }

    /**
     * Converte qualquer escala de nota vinda do CSV (0-1, 0-5 ou 0-100) para a régua unificada 0-100.
     */
    private double normalizarPara100(double valor) {
        if (valor <= 0) return 0.0;
        if (valor <= 1.0) return round(valor * 100.0); // ex: 0.7448 -> 74.48
        if (valor <= 5.0) return round((valor / 5.0) * 100.0); // ex: 2.5 -> 50.0
        return round(valor); // Já está em 0-100
    }

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
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