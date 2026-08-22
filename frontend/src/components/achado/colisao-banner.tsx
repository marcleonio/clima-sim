import { ShieldAlert, Users } from "lucide-react";

import { codigoAchado, diagnosticoColisao, formatarNumero, type Ente } from "@/lib/achados";

/**
 * Onde a fragilidade institucional encontra o risco de vida.
 *
 * Fica no topo do painel porque responde à primeira pergunta de quem chega:
 * "de tudo que está errado aqui, o que precisa ser resolvido primeiro?".
 */
export function ColisaoBanner({ ente }: { ente: Ente }) {
  const { criticos, pessoasExpostas, temColisao } = diagnosticoColisao(ente);

  if (!temColisao) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/6 p-4">
        <p className="text-sm font-semibold text-primary">Sem colisão crítica</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Este ente não apresenta lacuna nos requisitos de defesa civil e adaptação — os que
          respondem diretamente por vidas em evento extremo.
        </p>
      </div>
    );
  }

  const nomes = Array.from(new Set(criticos.map((a) => a.nome)));

  return (
    <div className="rounded-xl border-2 border-destructive/50 bg-destructive/6 p-4">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 size-4 flex-none text-destructive" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-destructive">
            Diagnóstico de colisão · resolver primeiro
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed">
            Este ente tem <strong>{criticos.length}</strong>{" "}
            {criticos.length === 1 ? "lacuna" : "lacunas"} em requisitos que existem para proteger
            a população em evento extremo — {nomes.join(" e ")}.
          </p>

          {pessoasExpostas != null && pessoasExpostas > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              <Users className="size-3.5" aria-hidden />
              {formatarNumero(pessoasExpostas)} pessoas sob jurisdição deste ente
            </p>
          )}

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {criticos.map((a) => (
              <li
                key={codigoAchado(a)}
                className="rounded-md bg-destructive/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive"
              >
                {codigoAchado(a)}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Mede a coincidência entre a população do ente e a ausência dos requisitos de proteção —
            não é modelo de risco físico.
          </p>
        </div>
      </div>
    </div>
  );
}
