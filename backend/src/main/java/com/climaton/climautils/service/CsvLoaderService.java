package com.climaton.climautils.service;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.climaton.climautils.dto.response.CsvUploadResultDTO;
import com.climaton.climautils.dto.response.EvidenciaItemResponse;
import com.climaton.climautils.model.EntityScores;
import com.climaton.climautils.model.EvaluationSnapshot;
import com.climaton.climautils.repository.EvaluationSnapshotRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvLoaderService {

    private final Map<String, EntityScores> databaseEmMemoria = new HashMap<>();
    private final Map<String, List<EvidenciaItemResponse>> evidenciasEmMemoria = new HashMap<>();
    private final EvaluationSnapshotRepository evaluationSnapshotRepository;

    @Transactional
    public Map<String, EntityScores> loadAndAggregateCsv() {
        if (!databaseEmMemoria.isEmpty()) {
            return databaseEmMemoria;
        }

        try {
            CsvProcessingData csvData = lerEAgruparRecords();
            Map<String, List<CSVRecord>> agrupado = csvData.agrupado();
            processarGrupos(agrupado);
            persistirSnapshot(csvData.dataAvaliacao(), csvData.versao(), new ArrayList<>(databaseEmMemoria.values()));
            log.info(">>> CSV do Painel ClimaBrasil carregado com sucesso! Total de entidades: " + databaseEmMemoria.size());
        } catch (Exception e) {
            log.error("Erro ao carregar o CSV: " + e.getMessage());
        }

        return databaseEmMemoria;
    }

    /**
     * Processa um CSV enviado pelo usuário (ex.: avaliação de um novo ano) no mesmo formato
     * do Painel ClimaBrasil. Garante que a base inicial já esteja carregada, calcula os scores
     * agregados do arquivo enviado, compara entidade a entidade com o estado atual (antes do
     * upload) e persiste tudo como um novo snapshot no histórico - o que já alimenta o gráfico
     * de evolução em {@link com.climaton.climautils.service.EvolutionReportService}. O estado em
     * memória (usado por /entidades, /evidencias e pela simulação) passa a refletir os dados
     * recém-importados.
     */
    @Transactional
    public CsvUploadResultDTO processarUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Nenhum arquivo enviado.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".csv")) {
            throw new IllegalArgumentException("Apenas arquivos .csv são aceitos.");
        }

        loadAndAggregateCsv();
        Map<String, EntityScores> scoresAnteriores = new HashMap<>(databaseEmMemoria);

        CsvProcessingData csvData;
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            csvData = lerEAgruparRecords(reader);
        } catch (IOException e) {
            throw new IllegalArgumentException("Não foi possível ler o arquivo CSV enviado: " + e.getMessage(), e);
        }

        if (csvData.agrupado().isEmpty()) {
            throw new IllegalArgumentException("O CSV enviado não contém registros válidos.");
        }
        if (evaluationSnapshotRepository.existsByDataAvaliacaoAndVersao(csvData.dataAvaliacao(), csvData.versao())) {
            throw new IllegalStateException(
                    "Já existe uma avaliação importada com esta data/versão (%s).".formatted(csvData.versao()));
        }

        processarGrupos(csvData.agrupado());
        persistirSnapshot(csvData.dataAvaliacao(), csvData.versao(), new ArrayList<>(databaseEmMemoria.values()));

        log.info(">>> Upload de CSV processado com sucesso! Versão: {}, Entidades: {}",
                csvData.versao(), databaseEmMemoria.size());

        return montarResultadoComparacao(csvData.dataAvaliacao(), csvData.versao(), scoresAnteriores, databaseEmMemoria);
    }

    private CsvUploadResultDTO montarResultadoComparacao(LocalDateTime dataAvaliacao, String versao,
            Map<String, EntityScores> anteriores, Map<String, EntityScores> atuais) {

        List<CsvUploadResultDTO.ComparacaoEntidadeDTO> comparacoes = new ArrayList<>();
        double somaVarFin = 0, somaVarGov = 0, somaVarPol = 0;
        int comparadas = 0;
        int novas = 0;

        for (Map.Entry<String, EntityScores> entry : atuais.entrySet()) {
            EntityScores nova = entry.getValue();
            EntityScores anterior = anteriores.get(entry.getKey());

            if (anterior == null) {
                novas++;
                continue;
            }

            comparadas++;
            somaVarFin += nova.getScoreFinanciamento() - anterior.getScoreFinanciamento();
            somaVarGov += nova.getScoreGovernanca() - anterior.getScoreGovernanca();
            somaVarPol += nova.getScorePoliticasPublicas() - anterior.getScorePoliticasPublicas();

            double geralAnterior = anterior.getScoreGeralMedia();
            double geralNovo = nova.getScoreGeralMedia();

            comparacoes.add(new CsvUploadResultDTO.ComparacaoEntidadeDTO(
                    nova.getEntityType(), nova.getEntityName(),
                    round(geralAnterior), round(geralNovo), round(geralNovo - geralAnterior)));
        }

        comparacoes.sort((a, b) -> Double.compare(Math.abs(b.getVariacao()), Math.abs(a.getVariacao())));
        List<CsvUploadResultDTO.ComparacaoEntidadeDTO> maioresVariacoes = comparacoes.stream().limit(10).toList();

        return new CsvUploadResultDTO(
                dataAvaliacao,
                versao,
                atuais.size(),
                novas,
                comparadas,
                comparadas > 0 ? round(somaVarFin / comparadas) : 0.0,
                comparadas > 0 ? round(somaVarGov / comparadas) : 0.0,
                comparadas > 0 ? round(somaVarPol / comparadas) : 0.0,
                maioresVariacoes
        );
    }

    private CsvProcessingData lerEAgruparRecords() throws Exception {
        ClassPathResource resource = new ClassPathResource("pcb-raw-data.csv");
        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            return lerEAgruparRecords(reader);
        }
    }

    private CsvProcessingData lerEAgruparRecords(Reader reader) throws IOException {
        CSVParser csvParser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .get()
                .parse(reader);

        Map<String, List<CSVRecord>> agrupado = new HashMap<>();
        LocalDateTime dataAvaliacao = null;
        String versao = null;

        for (CSVRecord csvRecord : csvParser) {
            if (dataAvaliacao == null) {
                dataAvaliacao = parseDataAvaliacao(csvRecord.get("assessment_completion_dt"));
            }
            if (versao == null || versao.isBlank()) {
                versao = csvRecord.get("assessment_version");
            }

            String key = csvRecord.get("entity_type") + ":" + csvRecord.get("entity_name");
            agrupado.computeIfAbsent(key, k -> new ArrayList<>()).add(csvRecord);
        }

        if (dataAvaliacao == null) {
            dataAvaliacao = LocalDateTime.now(ZoneOffset.UTC);
        }

        return new CsvProcessingData(agrupado, dataAvaliacao, versao == null ? "" : versao.trim());
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
            } else if (scoreText != null && "Sem progresso".equalsIgnoreCase(scoreText.trim())) {
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
     * Converte a média da escala 0-1 para 0-100 quando necessário.
     */
    private double normalizarPara100(double valor) {
        if (valor <= 0) return 0.0;
        if (valor <= 1.0) return round(valor * 100.0);
        return round(valor);
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

    private LocalDateTime parseDataAvaliacao(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) {
            return LocalDateTime.now(ZoneOffset.UTC);
        }

        try {
            return LocalDateTime.ofInstant(Instant.parse(rawDate.trim()), ZoneOffset.UTC);
        } catch (Exception e) {
            return LocalDateTime.now(ZoneOffset.UTC);
        }
    }

    private void persistirSnapshot(LocalDateTime dataAvaliacao, String versao, List<EntityScores> scores) {
        if (evaluationSnapshotRepository.existsByDataAvaliacaoAndVersao(dataAvaliacao, versao)) {
            return;
        }

        EvaluationSnapshot snapshot = new EvaluationSnapshot();
        snapshot.setDataAvaliacao(dataAvaliacao);
        snapshot.setVersao(versao);

        for (EntityScores score : scores) {
            snapshot.addScore(score);
        }

        evaluationSnapshotRepository.save(snapshot);
    }

    private record CsvProcessingData(Map<String, List<CSVRecord>> agrupado,
                                     LocalDateTime dataAvaliacao,
                                     String versao) {
    }
}