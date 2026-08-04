import { NextResponse } from "next/server"
import { ENTIDADES_BASE } from "@/lib/entidades-base"
import type { EntityScores } from "@/lib/types"

const BASE_URL = process.env.CLIMA_API_URL ?? "http://localhost:8080"

function normalizar(payload: unknown): EntityScores[] {
  const bruto = Array.isArray(payload) ? payload : Object.values(payload as Record<string, EntityScores>)
  return bruto
    .filter((e): e is EntityScores => Boolean(e) && typeof (e as EntityScores).entityName === "string")
    .map((e) => ({
      ...e,
      entityType: String(e.entityType ?? "").toLocaleUpperCase("pt-BR").includes("MUNIC")
        ? "MUNICIPIO"
        : "ESTADO",
      scoreGeralMedia:
        e.scoreGeralMedia ??
        Number(
          ((e.scoreFinanciamento + e.scoreGovernanca + e.scorePoliticasPublicas) / 3).toFixed(1),
        ),
    }))
}

export async function GET() {
  try {
    const resposta = await fetch(`${BASE_URL}/api/v1/simulacao/entidades`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`)
    const entidades = normalizar(await resposta.json())
    if (!entidades.length) throw new Error("Lista vazia")
    return NextResponse.json({ origem: "api", entidades })
  } catch (erro) {
    console.log("[v0] API ClimaUtils indisponivel para /entidades:", (erro as Error).message)
    return NextResponse.json({ origem: "local", entidades: ENTIDADES_BASE })
  }
}
