import { Banknote, Landmark, ScrollText } from "lucide-react"

const EIXOS = [
  {
    icone: Banknote,
    nome: "Financiamento Climático",
    descricao:
      "Volume de recursos empenhados, capacidade de captação em fundos e continuidade do investimento entre exercícios.",
    efeito: "Puxa a execução, mas satura quando a gestão não acompanha.",
  },
  {
    icone: Landmark,
    nome: "Governança & Transparência",
    descricao:
      "Existência de plano climático, publicação de dados auditáveis e controle sobre a aplicação dos recursos.",
    efeito: "É o eixo que multiplica o retorno dos outros dois.",
  },
  {
    icone: ScrollText,
    nome: "Execução de Políticas",
    descricao:
      "Ações efetivamente entregues: adaptação urbana, resíduos, mobilidade, uso do solo e resposta a desastres.",
    efeito: "Responde com atraso: o efeito pleno aparece no terceiro ano.",
  },
]

export function Eixos() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col gap-3 pb-10">
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Os três eixos do índice
          </span>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            Nenhum eixo se move sozinho.
          </h2>
        </div>

        <ul className="grid gap-px bg-border md:grid-cols-3">
          {EIXOS.map((eixo) => (
            <li key={eixo.nome} className="flex flex-col gap-4 bg-card p-6">
              <eixo.icone className="size-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-medium">{eixo.nome}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{eixo.descricao}</p>
              <p className="mt-auto border-t border-border pt-4 text-sm leading-relaxed text-foreground">
                {eixo.efeito}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
