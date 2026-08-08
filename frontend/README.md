# Clima Sim Insights

tenho essa API e tenho que criar um site bem bonito com as cores do meio ambiente para poder demostar o impacto que alterações de politicas publicas podem afetar o cima em politicas publicas, finanças e governança

{"openapi":"3.0.1","info":{"title":"ClimaUtils API - Painel ClimaBrasil","description":"API REST de simulação preditiva e cálculo de trade-offs para o Painel ClimaBrasil usando Regressão OLS.","contact":{"name":"Equipe ClimaUtils","email":"contato@climautils.com"},"version":"1.0.0"},"servers":[{"url":"http://localhost:8080","description":"Generated server url"}],"tags":[{"name":"Simulação Climática","description":"Endpoints para recálculo de projeções dos 4 anos de mandato"}],"paths":{"/api/v1/simulacao/recalculate":{"post":{"tags":["Simulação Climática"],"summary":"Recalcular Projeções e Trade-offs","description":"Recebe os ajustes percentuais dos eixos e aplica o modelo de regressão para simular os 4 anos de mandato.","operationId":"recalcular","requestBody":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/SimulacaoRequest"}}},"required":true},"responses":{"400":{"description":"Parâmetros de simulação inválidos","content":{"*/*":{"schema":{"$ref":"#/components/schemas/SimulacaoResponse"}}}},"200":{"description":"Simulação calculada com sucesso","content":{"*/*":{"schema":{"$ref":"#/components/schemas/SimulacaoResponse"}}}}}}},"/api/v1/simulacao/entidades":{"get":{"tags":["Simulação Climática"],"summary":"Listar Entidades e Scores Base","description":"Retorna todos os estados e municípios com as notas atuais do CSV.","operationId":"listarEntidades","responses":{"200":{"description":"OK","content":{"*/*":{"schema":{"type":"object","additionalProperties":{"$ref":"#/components/schemas/EntityScores"}}}}}}}}},"components":{"schemas":{"SimulacaoRequest":{"type":"object","properties":{"tipoEntidade":{"type":"string","description":"Dados para envio da simulação com percentuais de variação"},"nomeEntidade":{"type":"string","description":"Nome do Estado ou Município","example":"Acre"},"ajusteFinanciamento":{"type":"number","description":"Ajuste percentual no Financiamento Climático (-100 a +100)","format":"double","example":15.0},"ajusteGovernanca":{"type":"number","description":"Ajuste percentual na Governança & Transparência (-100 a +100)","format":"double","example":-5.0},"ajustePoliticas":{"type":"number","description":"Ajuste percentual na Execução de Políticas Públicas (-100 a +100)","format":"double","example":20.0}}},"DataSetLinhaResponse":{"type":"object","properties":{"nomeLinha":{"type":"string"},"corLinhaHex":{"type":"string"},"valoresAnoAAno":{"type":"array","items":{"type":"number","format":"double"}}}},"KpiEixoResponse":{"type":"object","properties":{"chaveEixo":{"type":"string"},"nomeExibicao":{"type":"string"},"scoreAtual":{"type":"number","format":"double"},"scoreProjetado":{"type":"number","format":"double"},"tendencia":{"type":"string"},"corSugestaoHex":{"type":"string"}}},"MetadadosResponse":{"type":"object","properties":{"entidadeSelecionada":{"type":"string"},"tipoEntidade":{"type":"string"},"dataSimulacao":{"type":"string"}}},"ResumoScoreResponse":{"type":"object","properties":{"scoreGeralAtual":{"type":"number","format":"double"},"scoreGeralProjetado":{"type":"number","format":"double"},"variacaoPercentual":{"type":"number","format":"double"},"statusGeral":{"type":"string"},"mensagemDiagnostico":{"type":"string"}}},"SeriesTemporaisResponse":{"type":"object","properties":{"labelsAnos":{"type":"array","items":{"type":"string"}},"linhasGrafico":{"type":"array","items":{"$ref":"#/components/schemas/DataSetLinhaResponse"}}}},"SimulacaoResponse":{"type":"object","properties":{"metadados":{"$ref":"#/components/schemas/MetadadosResponse"},"resumo":{"$ref":"#/components/schemas/ResumoScoreResponse"},"kpisEixos":{"type":"array","items":{"$ref":"#/components/schemas/KpiEixoResponse"}},"seriesTemporais":{"$ref":"#/components/schemas/SeriesTemporaisResponse"},"listaTradeOffs":{"type":"array","items":{"$ref":"#/components/schemas/TradeOffResponse"}}}},"TradeOffResponse":{"type":"object","properties":{"tipo":{"type":"string"},"eixoAfetado":{"type":"string"},"titulo":{"type":"string"},"descricaoAmigavel":{"type":"string"}}},"EntityScores":{"type":"object","properties":{"entityId":{"type":"number","format":"double"},"entityType":{"type":"string"},"entityName":{"type":"string"},"scoreFinanciamento":{"type":"number","format":"double"},"scoreGovernanca":{"type":"number","format":"double"},"scorePoliticasPublicas":{"type":"number","format":"double"},"scoreGeralMedia":{"type":"number","format":"double"}}}}}}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://policy-effect-simulator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1002489f-9ac5-4fbe-a2f6-089ae5923607).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
