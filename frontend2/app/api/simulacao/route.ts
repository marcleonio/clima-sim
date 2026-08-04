import { NextResponse } from "next/server"
import { simularLocalmente } from "@/lib/modelo-local"
import type { SimulacaoRequest, SimulacaoResponse } from "@/lib/types"

const BASE_URL = process.env.CLIMA_API_URL ?? "http://localhost:8080"

function validar(corpo: Partial<SimulacaoRequest>): SimulacaoRequest | null {
  const nome = typeof corpo.nomeEntidade === "string" ? corpo.nomeEntidade.trim() : ""
  if (!nome) return null
  const faixa = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(-100, v)) : 0
  return {
    tipoEntidade: corpo.tipoEntidade === "MUNICIPIO" ? "MUNICIPIO" : "ESTADO",
    nomeEntidade: nome,
    ajusteFinanciamento: faixa(corpo.ajusteFinanciamento),
    ajusteGovernanca: faixa(corpo.ajusteGovernanca),
    ajustePoliticas: faixa(corpo.ajustePoliticas),
  }
}

export async function POST(request: Request) {
  const corpo = validar(await request.json().catch(() => ({})))
  if (!corpo) {
    return NextResponse.json({ erro: "Parâmetros de simulação inválidos." }, { status: 400 })
  }

  try {
    const resposta = await fetch(`${BASE_URL}/api/v1/simulacao/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(corpo),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    })
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`)
    const dados = (await resposta.json()) as SimulacaoResponse
    if (!dados?.resumo || !dados?.seriesTemporais) throw new Error("Payload inesperado")
    return NextResponse.json({ ...dados, origemCalculo: "api" })
  } catch (erro) {
    console.log("[v0] API ClimaUtils indisponivel para /recalculate:", (erro as Error).message)
    return NextResponse.json(simularLocalmente(corpo))
  }
}
