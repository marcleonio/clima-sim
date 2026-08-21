import { useRef, useState } from "react";
import { CheckCircle2, TriangleAlert, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importarCsv, type CsvUploadResult } from "@/lib/clima-api";

function VariacaoMedia({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
      <p className={`font-display text-2xl ${valor >= 0 ? "text-primary" : "text-destructive"}`}>
        {valor > 0 ? "+" : ""}
        {valor.toFixed(1)}
      </p>
      <p className="text-xs text-muted-foreground">variação média</p>
    </div>
  );
}

export function CsvUploadCard({
  onImportado,
}: {
  onImportado: (resultado: CsvUploadResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CsvUploadResult | null>(null);

  const enviar = async () => {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await importarCsv(arquivo);
      setResultado(res);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      onImportado(res);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao importar o CSV.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="card-soft border-border/70">
      <CardHeader>
        <CardTitle className="text-xl">Importar novo CSV de avaliação</CardTitle>
        <p className="text-sm text-muted-foreground">
          Envie o CSV de um novo ano no mesmo formato do Painel ClimaBrasil. A avaliação importada
          entra no histórico e passa a aparecer no gráfico de evolução abaixo, comparada com o que
          já existia — e o modelo de regressão é retreinado automaticamente com os dados novos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setResultado(null);
              setErro(null);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" />
            {arquivo ? arquivo.name : "Escolher arquivo .csv"}
          </Button>
          <Button type="button" onClick={() => void enviar()} disabled={!arquivo || enviando}>
            {enviando ? "Importando…" : "Importar"}
          </Button>
        </div>

        {erro && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                Avaliação &ldquo;{resultado.versao}&rdquo; importada com sucesso (
                {resultado.totalEntidadesProcessadas} entidades, {resultado.entidadesNovas} novas,{" "}
                {resultado.entidadesComparadas} comparadas com o snapshot anterior).
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <VariacaoMedia rotulo="Financiamento" valor={resultado.variacaoMediaFinanciamento} />
              <VariacaoMedia rotulo="Governança" valor={resultado.variacaoMediaGovernanca} />
              <VariacaoMedia rotulo="Políticas Públicas" valor={resultado.variacaoMediaPoliticas} />
            </div>

            {resultado.maioresVariacoes.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Entidade</th>
                      <th className="px-3 py-2 text-right">Antes</th>
                      <th className="px-3 py-2 text-right">Depois</th>
                      <th className="px-3 py-2 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.maioresVariacoes.map((c) => (
                      <tr
                        key={`${c.entityType}:${c.entityName}`}
                        className="border-t border-border/60"
                      >
                        <td className="px-3 py-2">
                          {c.entityName}{" "}
                          <span className="text-xs text-muted-foreground">({c.entityType})</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {c.scoreAnteriorGeral.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {c.scoreNovoGeral.toFixed(1)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-semibold tabular-nums ${
                            c.variacao >= 0 ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {c.variacao > 0 ? "+" : ""}
                          {c.variacao.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
