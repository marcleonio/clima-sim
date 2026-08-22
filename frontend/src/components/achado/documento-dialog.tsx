import { FileDown, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { codigoAchado } from "@/lib/achados";
import { baixarDocumentoPdf } from "@/lib/documento-pdf";
import type { DocumentoGerado } from "@/lib/documentos";

/**
 * Pré-visualização da peça em formato de papel ofício. O contraste com a
 * interface (fundo branco, serifa, margens largas) é intencional: o usuário
 * precisa reconhecer de imediato que aquilo é um documento, não mais uma tela.
 */
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

  const { protocolo } = documento;

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
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Protocolo {protocolo.numero} · sha {protocolo.sha}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 size-3.5" aria-hidden />
              Imprimir
            </Button>
            <Button size="sm" onClick={() => void baixarDocumentoPdf(documento)}>
              <FileDown className="mr-1.5 size-3.5" aria-hidden />
              Baixar PDF
            </Button>
          </div>
        </div>

        {/* min-h-0 desarma o `min-height: auto` implícito do item de grade. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain bg-white">
          <article
            data-documento
            className="mx-auto max-w-[46rem] px-7 py-10 font-serif text-[0.9rem] leading-relaxed text-neutral-900 sm:px-14 sm:py-14"
          >
            <h2 className="text-center font-sans text-base font-bold uppercase tracking-wide">
              {documento.titulo}
            </h2>
            <p className="mt-1 text-center font-mono text-[11px] text-neutral-500">
              Protocolo {protocolo.numero} · sha {protocolo.sha} · {documento.emitidoEm}
            </p>

            <dl className="mt-8 space-y-3">
              <div>
                <dt className="font-sans text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Destinatário
                </dt>
                <dd>{documento.destinatario}</dd>
              </div>
              <div>
                <dt className="font-sans text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Assunto
                </dt>
                <dd>{documento.assunto}</dd>
              </div>
              <div>
                <dt className="font-sans text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Fundamento
                </dt>
                <dd>{documento.fundamento}</dd>
              </div>
            </dl>

            <hr className="my-7 border-neutral-200" />

            {documento.paragrafos.slice(0, 3).map((p, i) => (
              <p key={i} className="mb-3">
                {p}
              </p>
            ))}

            <ul className="my-5 space-y-4">
              {documento.achados.map((a) => (
                <li key={codigoAchado(a)} className="border-l-[3px] border-red-700 pl-4">
                  <p className="font-sans text-sm font-bold">
                    {codigoAchado(a)} — {a.nome}
                  </p>
                  {a.lei && (
                    <p className="mt-0.5 font-mono text-[11px] text-red-800">Base normativa: {a.lei}</p>
                  )}
                  <p className="mt-1.5 text-[0.87rem] text-neutral-700">{a.txt}</p>
                  {documento.preencherCampos && (
                    <div className="mt-3 space-y-1.5 font-mono text-[11px] text-neutral-500">
                      {documento.quesitos.map((q) => (
                        <p key={q}>
                          {q.replace(/;$/, "")}: <span className="text-neutral-300">{"_".repeat(38)}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {!documento.preencherCampos && documento.quesitos.length > 0 && (
              <ol className="mb-4 list-decimal space-y-1.5 pl-6">
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

            <p className="mt-10 border-t border-neutral-200 pt-4 font-mono text-[10px] leading-relaxed text-neutral-500">
              Documento gerado a partir de dados públicos oficiais.
              <br />
              Fonte: {documento.fonte}
            </p>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
