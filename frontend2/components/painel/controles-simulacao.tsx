"use client"

import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { EntityScores, TipoEntidade } from "@/lib/types"

export interface Ajustes {
  ajusteFinanciamento: number
  ajusteGovernanca: number
  ajustePoliticas: number
}

const EIXOS: { chave: keyof Ajustes; nome: string; ajuda: string }[] = [
  {
    chave: "ajusteFinanciamento",
    nome: "Financiamento Climático",
    ajuda: "Variação do orçamento climático em relação ao praticado hoje.",
  },
  {
    chave: "ajusteGovernanca",
    nome: "Governança & Transparência",
    ajuda: "Variação em plano climático, dados auditáveis e controle da execução.",
  },
  {
    chave: "ajustePoliticas",
    nome: "Execução de Políticas",
    ajuda: "Variação no volume de ações efetivamente entregues.",
  },
]

interface Props {
  entidades: EntityScores[]
  carregandoEntidades: boolean
  tipoEntidade: TipoEntidade
  nomeEntidade: string
  ajustes: Ajustes
  onTipoChange: (tipo: TipoEntidade) => void
  onEntidadeChange: (nome: string) => void
  onAjusteChange: (chave: keyof Ajustes, valor: number) => void
  onReset: () => void
}

export function ControlesSimulacao({
  entidades,
  carregandoEntidades,
  tipoEntidade,
  nomeEntidade,
  ajustes,
  onTipoChange,
  onEntidadeChange,
  onAjusteChange,
  onReset,
}: Props) {
  const listaFiltrada = entidades
    .filter((e) => e.entityType === tipoEntidade)
    .sort((a, b) => a.entityName.localeCompare(b.entityName, "pt-BR"))

  const semAjuste = Object.values(ajustes).every((v) => v === 0)

  return (
    <section
      aria-labelledby="titulo-controles"
      className="flex flex-col gap-6 border border-border bg-card p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-controles" className="text-sm font-medium">
            Cenário
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ajuste cada eixo entre -100% e +100% da nota atual.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={semAjuste}
          aria-label="Zerar todos os ajustes"
        >
          <RotateCcw className="size-3.5" />
          Zerar
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-px bg-border" role="group" aria-label="Tipo de entidade">
          {(["ESTADO", "MUNICIPIO"] as TipoEntidade[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => onTipoChange(tipo)}
              aria-pressed={tipoEntidade === tipo}
              className="bg-card px-3 py-2 font-mono text-[11px] tracking-widest uppercase transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:bg-secondary aria-pressed:hover:bg-primary"
            >
              {tipo === "ESTADO" ? "Estados" : "Municípios"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="seletor-entidade" className="text-xs font-medium text-muted-foreground">
            Ente federativo
          </label>
          {carregandoEntidades ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <Select
              items={listaFiltrada.map((e) => ({ value: e.entityName, label: e.entityName }))}
              value={nomeEntidade}
              onValueChange={(valor) => onEntidadeChange(String(valor))}
            >
              <SelectTrigger id="seletor-entidade" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{tipoEntidade === "ESTADO" ? "Estados" : "Municípios"}</SelectLabel>
                  {listaFiltrada.map((entidade) => (
                    <SelectItem key={entidade.entityId} value={entidade.entityName}>
                      {entidade.entityName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 border-t border-border pt-6">
        {EIXOS.map((eixo) => {
          const valor = ajustes[eixo.chave]
          return (
            <div key={eixo.chave} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={eixo.chave} className="text-sm font-medium">
                  {eixo.nome}
                </label>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    valor > 0 ? "text-primary" : valor < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {valor > 0 ? "+" : ""}
                  {valor}%
                </span>
              </div>
              <Slider
                id={eixo.chave}
                min={-100}
                max={100}
                step={5}
                value={[valor]}
                onValueChange={(v) => onAjusteChange(eixo.chave, Array.isArray(v) ? v[0] : v)}
                aria-label={`${eixo.nome}: ajuste percentual`}
                aria-describedby={`${eixo.chave}-ajuda`}
              />
              <p id={`${eixo.chave}-ajuda`} className="text-xs leading-relaxed text-muted-foreground">
                {eixo.ajuda}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
