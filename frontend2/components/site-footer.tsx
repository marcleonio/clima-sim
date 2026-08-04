export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <p className="text-sm text-muted-foreground">
          Painel ClimaBrasil — projeções calculadas pela ClimaUtils API.
        </p>
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Dados de base: notas de financiamento, governança e políticas públicas
        </p>
      </div>
    </footer>
  )
}
