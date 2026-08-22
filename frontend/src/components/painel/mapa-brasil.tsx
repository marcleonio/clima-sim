import { useMemo, useState } from "react";

import { degrauDeficit } from "@/components/achado/componente-heatmap";
import { formatarNumero, formatarPercentual } from "@/lib/achados";
import type { EnteResumo } from "@/lib/dados";
import { SIGLA_UF, ufDe } from "@/lib/territorio";
import { cn } from "@/lib/utils";
import mapaBruto from "@/data/mapa-brasil.json";

/**
 * Mapa coroplético dos entes avaliados.
 *
 * SVG inline, sem biblioteca de mapa e sem tile server: 27 unidades federativas
 * não precisam de projeção configurável nem de runtime de 200 KB, precisam de
 * 27 atributos `d`. Gerados por `analise/gerar-mapa.mjs` a partir da malha do
 * IBGE, eles herdam a paleta por variável CSS, funcionam nos dois temas e
 * imprimem junto com a página.
 *
 * A cor é a mesma rampa de déficit do mapa de calor do dossiê — matiz única e
 * luminância monotônica, para a leitura sobreviver a escala de cinza, à
 * impressão e ao daltonismo. As capitais entram como círculos sobre o estado,
 * coloridas pelo próprio desempenho: são entes avaliados separadamente, e uma
 * capital frágil dentro de um estado maduro é exatamente o tipo de coisa que o
 * mapa precisa deixar ver.
 */

interface Mapa {
  viewBox: string;
  ufs: Record<string, string>;
  capitais: Record<string, { nome: string; x: number; y: number; uf: string }>;
}

const MAPA = mapaBruto as unknown as Mapa;

interface Destaque {
  nome: string;
  ente: EnteResumo;
  x: number;
  y: number;
}

export function MapaBrasil({
  entes,
  selecionado,
  onSelecionar,
  mostrarCapitais = true,
  realcado,
  onRealcar,
}: {
  /** Entes do recorte atual — o que estiver fora fica cinza, não some. */
  entes: Record<string, EnteResumo>;
  selecionado?: string | null;
  onSelecionar?: (nome: string | null) => void;
  mostrarCapitais?: boolean;
  /** Ente sob o cursor em qualquer outro componente da tela. */
  realcado?: string | null;
  onRealcar?: (nome: string | null) => void;
}) {
  const [sobre, setSobre] = useState<Destaque | null>(null);

  /*
   * Destacar, não excluir.
   *
   * Quando há um ente em foco, os demais são ATENUADOS em vez de removidos. Um
   * filtro que apaga o resto tira o contexto junto com o dado: você deixa de ver
   * onde o ente escolhido está em relação ao país. Atenuar responde à mesma
   * pergunta sem perder a referência.
   */
  const emFoco = realcado ?? selecionado ?? null;
  const opacidadeDe = (nome: string | undefined) =>
    !emFoco || nome === emFoco ? 1 : 0.28;

  /** Índice por código IBGE, para o desenho achar o dado em O(1). */
  const { porUf, porMunicipio } = useMemo(() => {
    const porUf = new Map<string, { nome: string; ente: EnteResumo }>();
    const porMunicipio = new Map<string, { nome: string; ente: EnteResumo }>();

    for (const [nome, ente] of Object.entries(entes)) {
      if (ente.id == null) continue;
      if (ente.tipo === "Município") porMunicipio.set(String(ente.id), { nome, ente });
      else porUf.set(ufDe(ente.id) ?? "", { nome, ente });
    }
    return { porUf, porMunicipio };
  }, [entes]);

  const corDe = (ente: EnteResumo | undefined) =>
    ente ? `var(--calor-${degrauDeficit(ente.mat)})` : "var(--muted)";

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center">
      {/*
        O mapa passa a caber no espaço que recebe, em vez de ditar a altura pela
        largura. Antes o SVG tinha 773px fixos e, somado aos filtros, exigia
        998px num viewport de 720 — operar o painel obrigava a subir e descer a
        cada ajuste.
      */}
      <svg
        viewBox={MAPA.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full max-h-full w-full"
        role="img"
        aria-label={`Mapa do Brasil com ${porUf.size} unidades federativas e ${porMunicipio.size} capitais avaliadas, coloridas pela pontuação de ação climática.`}
      >
        <g>
          {Object.entries(MAPA.ufs).map(([codigo, d]) => {
            const alvo = porUf.get(codigo);
            const ativo = alvo && selecionado === alvo.nome;
            const sigla = SIGLA_UF[codigo] ?? codigo;

            return (
              <path
                key={codigo}
                d={d}
                fill={corDe(alvo?.ente)}
                stroke="var(--background)"
                strokeWidth={ativo ? 2.5 : 1}
                opacity={opacidadeDe(alvo?.nome)}
                className={cn(
                  "transition-[stroke-width,opacity] duration-200",
                  alvo && onSelecionar && "cursor-pointer",
                  ativo && "[stroke:var(--foreground)]",
                )}
                tabIndex={alvo && onSelecionar ? 0 : undefined}
                role={alvo && onSelecionar ? "button" : undefined}
                aria-label={
                  alvo
                    ? `${alvo.nome}: ${alvo.ente.lac} de ${alvo.ente.tot} itens sem progresso`
                    : `${sigla} — não avaliado`
                }
                onClick={
                  alvo && onSelecionar
                    ? () => onSelecionar(selecionado === alvo.nome ? null : alvo.nome)
                    : undefined
                }
                onKeyDown={
                  alvo && onSelecionar
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelecionar(selecionado === alvo.nome ? null : alvo.nome);
                        }
                      }
                    : undefined
                }
                onMouseEnter={(e) => {
                  if (!alvo) return;
                  const caixa = (e.target as SVGPathElement).getBBox();
                  setSobre({
                    nome: alvo.nome,
                    ente: alvo.ente,
                    x: caixa.x + caixa.width / 2,
                    y: caixa.y + caixa.height / 2,
                  });
                  onRealcar?.(alvo.nome);
                }}
                onMouseLeave={() => {
                  setSobre(null);
                  onRealcar?.(null);
                }}
              />
            );
          })}
        </g>

        {mostrarCapitais && (
          <g>
            {Object.entries(MAPA.capitais).map(([codigo, c]) => {
              const alvo = porMunicipio.get(codigo);
              if (!alvo) return null;
              const ativo = selecionado === alvo.nome;

              return (
                <circle
                  key={codigo}
                  cx={c.x}
                  cy={c.y}
                  r={ativo ? 7 : 5}
                  fill={corDe(alvo.ente)}
                  stroke="var(--foreground)"
                  strokeWidth={ativo ? 2 : 1}
                  opacity={opacidadeDe(alvo.nome)}
                  className={cn(
                    "transition-[r,opacity] duration-200",
                    onSelecionar && "cursor-pointer",
                  )}
                  tabIndex={onSelecionar ? 0 : undefined}
                  role={onSelecionar ? "button" : undefined}
                  aria-label={`${alvo.nome} (capital): ${alvo.ente.lac} de ${alvo.ente.tot} itens sem progresso`}
                  onClick={
                    onSelecionar
                      ? () => onSelecionar(ativo ? null : alvo.nome)
                      : undefined
                  }
                  onKeyDown={
                    onSelecionar
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelecionar(ativo ? null : alvo.nome);
                          }
                        }
                      : undefined
                  }
                  onMouseEnter={() => {
                    setSobre({ nome: alvo.nome, ente: alvo.ente, x: c.x, y: c.y });
                    onRealcar?.(alvo.nome);
                  }}
                  onMouseLeave={() => {
                    setSobre(null);
                    onRealcar?.(null);
                  }}
                />
              );
            })}
          </g>
        )}
      </svg>

      {/* resumo ao passar o mouse — posicionado em coordenadas do viewBox */}
      {sobre && (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover p-2.5 text-sm shadow-lg"
          style={{
            left: `${(sobre.x / 620) * 100}%`,
            top: `${(sobre.y / 660) * 100}%`,
          }}
        >
          <p className="font-semibold">{sobre.nome}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sobre.ente.tipo}</p>
          <dl className="mt-1.5 space-y-0.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Itens sem progresso</dt>
              <dd className="font-semibold tabular-nums">
                {sobre.ente.lac}/{sobre.ente.tot}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Pontuação</dt>
              <dd className="font-semibold tabular-nums">{formatarPercentual(sobre.ente.mat)}</dd>
            </div>
            {sobre.ente.pop != null && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">População</dt>
                <dd className="tabular-nums">{formatarNumero(sobre.ente.pop)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

/** Legenda da rampa. Fica fora do SVG para poder quebrar linha no celular. */
export function LegendaMapa() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <span>menor pontuação</span>
        <span className="flex overflow-hidden rounded-sm" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="block size-3.5" style={{ background: `var(--calor-${i})` }} />
          ))}
        </span>
        <span>mais</span>
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden>
          <circle cx="7" cy="7" r="4.5" fill="var(--muted-foreground)" />
        </svg>
        capital, avaliada à parte do estado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="block size-3.5 rounded-sm bg-muted" aria-hidden />
        fora do recorte
      </span>
    </div>
  );
}
