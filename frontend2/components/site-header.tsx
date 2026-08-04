import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SiteHeader({ variante = "landing" }: { variante?: "landing" | "painel" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center bg-primary">
            <span className="h-2.5 w-2.5 border border-primary-foreground" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Clima<span className="text-primary">Brasil</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] tracking-widest text-muted-foreground uppercase sm:inline">
            Regressão OLS · Mandato 2027–2030
          </span>
          {variante === "landing" ? (
            <Button size="sm" nativeButton={false} render={<Link href="/painel" />}>
              Abrir simulador
            </Button>
          ) : (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/" />}>
              Sobre o painel
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
