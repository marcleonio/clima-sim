"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2, ServerOff } from "lucide-react"
import { ControlesSimulacao, type Ajustes } from "./controles-simulacao"
import { GraficoProjecao } from "./grafico-projecao"
import { KpisEixos } from "./kpis-eixos"
import { ListaTradeOffs } from "./lista-trade-offs"
import { ResumoScore } from "./resumo-score"
import type { EntityScores, SimulacaoResponse, TipoEntidade } from "@/lib/types"

const AJUSTES_INICIAIS: Ajustes = {
  ajusteFinanciamento: 15,
  ajusteGovernanca: 0,
  ajustePoliticas: 20,
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function useDebounce<T>(valor: T, atraso = 350) {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), atraso)
    return () => clearTimeout(id)
  }, [valor, atraso])
  return atrasado
}

export function PainelSimulacao() {
  const [tipoEntidade, setTipoEntidade] = useState<TipoEntidade>("ESTADO")
  const [nomeEntidade, setNomeEntidade] = useState("São Paulo")
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIAIS)

  const { data: dadosEntidades, isLoading: carregandoEntidades } = useSWR<{
    origem: "api" | "local"
    entidades: EntityScores[]
  }>("/api/entidades", fetcher, { revalidateOnFocus: false })

  const entidades = dadosEntidades?.entidades ?? []

  const chave = useDebounce(
    JSON.stringify({ tipoEntidade, nomeEntidade, ...ajustes }),
    350,
  )

  const { data: simulacao, isLoading: carregandoSimulacao } = useSWR<SimulacaoResponse>(
    ["/api/simulacao", chave],
    async ([url, corpo]: [string, string]) => {
      const resposta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corpo,
      })
      if (!resposta.ok) throw new Error("Falha ao calcular a simulação.")
      return resposta.json()
    },
    { keepPreviousData: true, revalidateOnFocus: false },
  )

  const recalculando = chave !== JSON.stringify({ tipoEntidade, nomeEntidade, ...ajustes })
  const carregando = carregandoSimulacao && !simulacao

  const usandoModeloLocal =
    simulacao?.origemCalculo === "local" || dadosEntidades?.origem === "local"

  const nomesDisponiveis = useMemo(
    () => entidades.filter((e) => e.entityType === tipoEntidade).map((e) => e.entityName),
    [entidades, tipoEntidade],
  )

  useEffect(() => {
    if (nomesDisponiveis.length && !nomesDisponiveis.includes(nomeEntidade)) {
      setNomeEntidade(nomesDisponiveis[0])
    }
  }, [nomesDisponiveis, nomeEntidade])

  return (
    <div className="flex flex-col gap-6">
      {usandoModeloLocal && (
        <div
          role="status"
          className="flex items-start gap-3 border border-accent/40 bg-accent/10 px-4 py-3"
        >
          <ServerOff className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-pretty">
            <span className="font-medium">Modelo de contingência ativo.</span> A ClimaUtils API não
            respondeu neste ambiente. Defina a variável <code className="font-mono text-xs">CLIMA_API_URL</code>{" "}
            com uma URL acessível publicamente para usar o cálculo OLS do backend.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <ControlesSimulacao
            entidades={entidades}
            carregandoEntidades={carregandoEntidades}
            tipoEntidade={tipoEntidade}
            nomeEntidade={nomeEntidade}
            ajustes={ajustes}
            onTipoChange={setTipoEntidade}
            onEntidadeChange={setNomeEntidade}
            onAjusteChange={(chaveEixo, valor) =>
              setAjustes((atual) => ({ ...atual, [chaveEixo]: valor }))
            }
            onReset={() =>
              setAjustes({ ajusteFinanciamento: 0, ajusteGovernanca: 0, ajustePoliticas: 0 })
            }
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative flex flex-col gap-6">
            {recalculando && (
              <span className="absolute -top-1 right-0 z-10 flex items-center gap-1.5 bg-background px-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                recalculando
              </span>
            )}
            <ResumoScore
              resumo={simulacao?.resumo}
              metadados={simulacao?.metadados}
              carregando={carregando}
            />
            <KpisEixos kpis={simulacao?.kpisEixos} carregando={carregando} />
          </div>
          <GraficoProjecao series={simulacao?.seriesTemporais} carregando={carregando} />
          <ListaTradeOffs tradeOffs={simulacao?.listaTradeOffs} carregando={carregando} />
        </div>
      </div>
    </div>
  )
}
