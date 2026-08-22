# analise/ — memorial de dados e arquitetura

Pasta de trabalho da virada estratégica do projeto para o **Climaton Brasil 2026**:
de simulador de cenários para **gerador de dossiês de evidência**.

## Por que esta pasta existe

Pesquisa de campo no próprio evento mostrou que as pessoas convencidas pelo argumento
da prevenção pediam a mesma coisa: **um PDF com as evidências, para marcar uma reunião
ou pedir uma auditoria**. O produto não é o painel — é o documento que sai dele.

Ao abrir o CSV bruto do Painel ClimaBrasil, a tese se confirmou tecnicamente:
a coluna `assessment_comment` guarda **2.245 pareceres técnicos escritos por auditores
de tribunais de contas** — um para cada requisito avaliado, inclusive para as 640 lacunas.
O painel público mostra só a nota. A evidência já existe; falta entregá-la.

## Conteúdo

| Arquivo | O que é |
|---|---|
| `01-exploracao-e-tese.ipynb` | Notebook executado que prova a tese, célula a célula, sobre o CSV real |
| `gerar_notebook.py` | Script que regenera o notebook (fonte de verdade — edite aqui, não no `.ipynb`) |
| `fluxo-da-solucao.html` | Arquitetura: diagramas de fluxo, ingestão, etapas de uso, atores e base factual |
| `dados/populacao_ibge_2021.json` | Cache local da estimativa populacional do IBGE (fallback offline) |
| `dados/componentes-oficiais.json` | Os 15 componentes com nome, definição e itens — extraídos da metodologia oficial |
| `dados/referencias-legais.json` | Base normativa de cada componente (Lei 12.608/2012, Marco de Sendai, etc.) |
| `dados/metodologia-pcb.pdf` · `.txt` | Metodologia oficial do Painel ClimaBrasil (18 p.) |
| `dados/manual-pcb.pdf` · `.txt` | Manual de aplicação do Painel ClimaBrasil (106 p.) |

## Reproduzir

```bash
python -m pip install pandas numpy matplotlib nbformat nbconvert ipykernel
python analise/gerar_notebook.py
python -m nbconvert --to notebook --execute --inplace analise/01-exploracao-e-tese.ipynb
```

O notebook roda offline usando o cache do IBGE; com rede, busca os dados atualizados na API.

## Principais achados

| Achado | Número |
|---|---|
| Requisitos avaliados | 2.245 em 49 entes |
| Cobertura de parecer técnico | **100%** (média de 812 caracteres) |
| Lacunas "Sem progresso" | 640 (28,5%) — a categoria mais frequente |
| Eixo mais frágil | **Financiamento**, 41,0% sem progresso |
| Requisito mais negligenciado | F3 — Mobilização de investimentos privados (56%) |
| Componente de Defesa civil (P5) | 35,8% — apoiado na **Lei 12.608/2012** e no Marco de Sendai |
| População em estados sem plena adaptação | **103,4 milhões** |
| População em estados com lacuna em Defesa Civil | **73,9 milhões** |
| Amplitude federativa | Boa Vista 97,7% × São Paulo, MG e RJ 0% |

## ⚠️ Avisos metodológicos

Leia antes de citar qualquer número em público:

1. **`backend/data/pcb-raw-data-2026.csv` é sintético.** Foi gerado por
   `scripts/gerar-csv-ano.js`, que só troca o ano do snapshot para testar a tela de
   evolução. **Não contém dados reais de 2026 e não serve como evidência.**
   A fonte válida é `backend/src/main/resources/pcb-raw-data.csv` (avaliação 2025).

2. **"População exposta" mede lacuna de governança, não risco físico.** A formulação
   correta é *"vive em um estado cujo governo apresenta lacuna no requisito X"* —
   nunca *"está em risco de morrer"*.

3. **Não há inferência causal em lugar nenhum desta análise.** O caso do Rio Grande do Sul
   é cronologia documentada, não relação de causa e efeito. A avaliação é **posterior**
   à enchente de maio de 2024.

4. **Sobre o RS, especificamente:** o estado **tem** estratégia de adaptação (ProClima2050).
   O que a avaliação apontou foi ausência de indicadores de monitoramento, de relatórios
   públicos de progresso e de formalização legal. Afirmar que "o RS não tinha plano" é
   falso e destruiria a credibilidade da equipe diante da banca.

## Fontes

- **Painel ClimaBrasil / TCU** — metodologia ClimateScanner (INTOSAI). Fonte primária.
  Dados brutos e metodologia em <https://climatescanner.org/pt/downloads-2/>.
  Os nomes dos 15 componentes e sua base legal saem da metodologia oficial —
  **não** de inferência sobre os pareceres.
- **SICONFI / Tesouro Nacional** — receita realizada (DCA).
- **IBGE** — estimativas populacionais, tabela SIDRA 6579.
- **Defesa Civil do RS**, **BID/CEPAL/Banco Mundial**, **MCTI**, **UNDRR/ONU**,
  **Greenpeace Brasil** — base factual da seção de impacto em `fluxo-da-solucao.html`.
