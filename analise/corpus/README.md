# corpus/ — a prateleira de contexto

Documentos que o agente pode consultar para montar **linha de investigação** —
nunca para afirmar fato sobre um ente.

## A regra que organiza esta pasta

Tudo no ClimaSim se apoia em duas coisas: o modelo não produz fatos, e o produto
não afirma causalidade. Um corpus existe justamente para sugerir causas. Se ele
entrar na mesma prateleira que os pareceres de auditoria, o produto perde o que
o torna defensável.

Por isso o que sai daqui sempre volta marcado como `natureza: "contexto"`, e o
agente é instruído a apresentá-lo em quatro blocos separados:

    EVIDÊNCIA        o que a base registra, com o código do item
    HIPÓTESE         o que este contexto sugere, com fonte e data
    COMO VERIFICAR   que documento pedir, que pergunta fazer no ofício
    O QUE NÃO PROVA  a ressalva, por extenso

## Formato

Um arquivo `.md` por documento, com frontmatter:

```markdown
---
titulo: Título legível do documento
fonte: Veículo, instituição ou periódico
data: 2024-05-10
tipo: revisado-por-pares
url: https://…
componentes: P5 P2
---

O texto. Transcrição ou trecho — não resumo.
```

`tipo` aceita, do mais para o menos pesado na ordenação:

| tipo | peso |
|---|---|
| `revisado-por-pares` | 1,00 |
| `metodologia-oficial` | 1,00 |
| `relatorio-institucional` | 0,85 |
| `norma` | 0,85 |
| `jornalismo` | 0,60 |

## Duas regras do ingestor

**Corte de data.** Nada posterior à extração da avaliação (`2025-09-12`) entra.
Explicar uma avaliação de setembro de 2025 com notícia de 2026 é anacronismo —
o auditor não tinha aquilo à frente quando avaliou.

**Indexação por componente, não por ente.** Indexar por "Bahia" convidaria o
modelo a casar notícia local com item local e narrar causa. Por tema do
requisito, ele devolve contexto sobre o problema, não sobre o culpado. É por
isso que `componentes:` é obrigatório e `ente` não existe no formato.

## O que já está aqui

Os 15 documentos de `manual-*.md` são **transcrição** da orientação oficial de
cada componente, extraída do manual do Painel ClimaBrasil por
`analise/extrair-orientacao.mjs`. Respondem à primeira pergunta que um auditor
faz diante de um item sem progresso: *o que exatamente se esperava aqui?*

## O que falta, e não é trabalho de máquina

Literatura e cobertura. Vinte a trinta documentos bem escolhidos valem mais que
mil raspados — o AR6 do IPCC nos capítulos de adaptação, o Plano Nacional de
Adaptação, relatórios do TCU sobre defesa civil, a cobertura das enchentes do RS
em 2024. **A lista precisa passar por alguém que responda por ela.** A estrutura,
o ingestor e a ferramenta estão prontos; a curadoria é decisão editorial.

## Reproduzir

```bash
node analise/extrair-orientacao.mjs   # semeia com a orientação oficial
node analise/gerar-corpus.mjs         # indexa por BM25 e grava corpus.json
```

O ingestor rejeita e explica: documento sem frontmatter, sem campo obrigatório,
com tipo desconhecido, com data posterior ao corte ou sem componente válido.
