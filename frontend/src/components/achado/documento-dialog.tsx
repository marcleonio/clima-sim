import { FileDown, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { codigoAchado, formatarNumero, formatarPercentual } from "@/lib/achados";
import { baixarDocumentoPdf } from "@/lib/documento-pdf";
import type { DocumentoGerado } from "@/lib/documentos";

/**
 * Pré-visualização da peça em formato de papel ofício.
 *
 * O contraste com a interface (fundo branco, serifa, margens largas) é
 * intencional: o usuário precisa reconhecer de imediato que aquilo é um
 * documento, não mais uma tela.
 *
 * A estrutura segue a de uma peça administrativa de verdade — capa com
 * identificação, quadro-resumo, sumário dos requisitos, corpo agrupado por eixo
 * e bloco de assinatura. Antes eram 43 achados e 135 parágrafos num bloco
 * corrido, que ninguém lê nem protocola.
 */

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <dt className="font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
      {children}
    </dt>
  );
}

export function DocumentoDialog({
  documento,
  aberto,
  onFechar,
}: {
  documento: DocumentoGerado | null;
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!documento) return null;

  const { protocolo, quadro, blocos, timbre } = documento;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      {/*
        grid-rows-[auto_minmax(0,1fr)] é o que faz a peça rolar.
        Uma linha de grade `auto` é dimensionada pela altura total do conteúdo e
        nunca encolhe; com o `overflow-hidden` do contêiner, o documento (≈6.000px)
        era recortado em ~91% e a rolagem ficava travada em scrollTop 0.
        O `minmax(0,…)` autoriza a linha a encolher, e aí o overflow do filho entra.
      */}
      <DialogContent className="grid max-h-[92vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {documento.titulo} — protocolo {protocolo.numero}
        </DialogTitle>

        <div
          data-acoes-documento
          className="flex flex-wrap items-center justify-between gap-2 border-b bg-card/95 px-4 py-3 backdrop-blur"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Protocolo {protocolo.numero} · conferência {protocolo.sha}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-11" onClick={() => window.print()}>
              <Printer className="mr-1.5 size-3.5" aria-hidden />
              Imprimir
            </Button>
            <Button size="sm" className="h-11" onClick={() => void baixarDocumentoPdf(documento)}>
              <FileDown className="mr-1.5 size-3.5" aria-hidden />
              Baixar PDF
            </Button>
          </div>
        </div>

        {/* min-h-0 desarma o `min-height: auto` implícito do item de grade. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain bg-white">
          <article
            data-documento
            className="mx-auto max-w-[46rem] px-7 py-10 font-serif text-[0.95rem] leading-relaxed text-neutral-900 sm:px-14 sm:py-14"
          >
            {/* ---------------- capa ---------------- */}
            <header className="border-b-2 border-neutral-800 pb-5">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {timbre.origem}
              </p>
              <h2 className="mt-2 font-sans text-xl font-bold uppercase leading-tight tracking-wide">
                {documento.titulo}
              </h2>
              <p className="mt-2 font-mono text-[11px] text-neutral-500">
                Protocolo {protocolo.numero} · código de conferência {protocolo.sha} ·{" "}
                {documento.emitidoEm}
              </p>
            </header>

            <dl className="mt-7 space-y-3">
              <div>
                <Rotulo>Destinatário</Rotulo>
                <dd>{documento.destinatario}</dd>
              </div>
              <div>
                <Rotulo>Assunto</Rotulo>
                <dd>{documento.assunto}</dd>
              </div>
              <div>
                <Rotulo>Fundamento</Rotulo>
                <dd>{documento.fundamento}</dd>
              </div>
            </dl>

            {/* ---------------- quadro-resumo ---------------- */}
            <section className="mt-8 border border-neutral-300 bg-neutral-50 p-5">
              <h3 className="font-sans text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Quadro-resumo
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div>
                  <p className="font-sans text-2xl font-bold leading-none tabular-nums">
                    {quadro.achados}
                  </p>
                  <p className="mt-1 font-sans text-[11px] leading-tight text-neutral-600">
                    achados nesta peça, de {quadro.requisitos} requisitos avaliados
                  </p>
                </div>
                <div>
                  <p className="font-sans text-2xl font-bold leading-none tabular-nums text-red-800">
                    {quadro.riscoDeVida}
                  </p>
                  <p className="mt-1 font-sans text-[11px] leading-tight text-neutral-600">
                    em defesa civil e adaptação
                  </p>
                </div>
                <div>
                  <p className="font-sans text-2xl font-bold leading-none tabular-nums">
                    {quadro.posicao}ª
                  </p>
                  <p className="mt-1 font-sans text-[11px] leading-tight text-neutral-600">
                    em fragilidade
                    {quadro.totalDeEntes ? ` entre ${quadro.totalDeEntes} entes` : ""}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-2xl font-bold leading-none tabular-nums">
                    {formatarPercentual(quadro.maturidade)}
                  </p>
                  <p className="mt-1 font-sans text-[11px] leading-tight text-neutral-600">
                    índice de maturidade
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-neutral-300 pt-3 font-sans text-[12px]">
                <dl className="flex flex-wrap gap-x-5 gap-y-1">
                  {quadro.porEixo.map(({ eixo, qtd }) => (
                    <span key={eixo}>
                      <dt className="inline text-neutral-600">{eixo}: </dt>
                      <dd className="inline font-semibold tabular-nums">{qtd}</dd>
                    </span>
                  ))}
                </dl>
                {quadro.populacao != null && (
                  <p className="mt-2 text-neutral-600">
                    Jurisdição com{" "}
                    <strong className="font-semibold tabular-nums text-neutral-900">
                      {formatarNumero(quadro.populacao)}
                    </strong>{" "}
                    habitantes.
                  </p>
                )}
              </div>
            </section>

            {/* ---------------- sumário ---------------- */}
            {blocos.length > 1 && (
              <section className="mt-7">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Requisitos tratados
                </h3>
                <ul className="mt-2 columns-2 gap-6 font-mono text-[11px] text-neutral-700">
                  {documento.achados.map((a) => (
                    <li key={codigoAchado(a)} className="break-inside-avoid">
                      {codigoAchado(a)} — {a.nome}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <hr className="my-7 border-neutral-300" />

            {/* ---------------- corpo ---------------- */}
            {documento.paragrafos.slice(0, 3).map((p, i) => (
              <p key={i} className="mb-3">
                {p}
              </p>
            ))}

            {blocos.map((bloco) => (
              <section key={bloco.eixo} className="mt-6">
                <h3 className="border-b border-neutral-300 pb-1 font-sans text-[13px] font-bold uppercase tracking-wider">
                  {bloco.eixo}
                  <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                    {bloco.achados.length} {bloco.achados.length === 1 ? "achado" : "achados"}
                  </span>
                </h3>

                <ul className="mt-4 space-y-5">
                  {bloco.achados.map((a) => (
                    <li
                      key={codigoAchado(a)}
                      className="break-inside-avoid border-l-[3px] border-red-700 pl-4"
                    >
                      <p className="font-sans text-sm font-bold">
                        {codigoAchado(a)} — {a.nome}
                      </p>
                      {a.lei && (
                        <p className="mt-0.5 font-mono text-[11px] text-red-800">
                          Base normativa: {a.lei}
                        </p>
                      )}
                      <p className="mt-1.5 text-[0.92rem] text-neutral-700">{a.txt}</p>
                      {documento.preencherCampos && (
                        <div className="mt-3 space-y-1.5 font-mono text-[11px] text-neutral-500">
                          {documento.quesitos.map((q) => (
                            <p key={q}>
                              {q.replace(/;$/, "")}:{" "}
                              <span className="text-neutral-300">{"_".repeat(34)}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {!documento.preencherCampos && documento.quesitos.length > 0 && (
              <ol className="mb-4 mt-7 list-decimal space-y-1.5 pl-6">
                {documento.quesitos.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            )}

            {documento.paragrafos.slice(3).map((p, i) => (
              <p key={i} className="mb-3">
                {p}
              </p>
            ))}

            {/* ---------------- trajetória ---------------- */}
            {documento.trajetoria && (
              <section className="mt-7 break-inside-avoid border border-neutral-300 p-4">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Trajetória de regularização
                </h3>
                <p className="mt-2 text-[0.92rem]">{documento.trajetoria}</p>
                <p className="mt-2 font-sans text-[11px] leading-relaxed text-neutral-500">
                  Aritmética da escala oficial da metodologia — quatro degraus por requisito,
                  índice igual à média. Não é previsão nem modelo estatístico, e não estima custo.
                </p>
              </section>
            )}

            {/* ---------------- assinatura ---------------- */}
            <div className="mt-12 break-inside-avoid">
              <p className="text-right text-neutral-400">{"_".repeat(28)}</p>
              <p className="mt-1 text-right font-sans text-[11px] uppercase tracking-wider text-neutral-500">
                Local e data
              </p>

              <p className="mt-8 text-center text-neutral-400">{"_".repeat(40)}</p>
              <p className="mt-1 text-center font-sans text-[11px] uppercase tracking-wider text-neutral-500">
                {timbre.assinatura}
              </p>
            </div>

            {/* ---------------- procedência ---------------- */}
            <footer className="mt-10 border-t border-neutral-300 pt-4 font-mono text-[10px] leading-relaxed text-neutral-500">
              <p>Documento gerado a partir de dados públicos oficiais.</p>
              <p className="mt-1">Fonte: {documento.fonte}</p>
              <p className="mt-1">{documento.conferencia}</p>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
