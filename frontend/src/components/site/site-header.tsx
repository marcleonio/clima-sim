import { Link } from "@tanstack/react-router";
import { Leaf, Menu } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/painel", label: "Painel" },
  { to: "/achados", label: "Consultar ente" },
  { to: "/metodologia", label: "Metodologia" },
  { to: "/impacto", label: "Impacto" },
] as const;

export function SiteHeader() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3">
        <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl leaf-gradient text-primary-foreground">
            <Leaf className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg leading-none">ClimaSim</span>
            <span className="block truncate text-xs uppercase tracking-widest text-muted-foreground">
              Do dado público à peça de cobrança
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="flex min-h-11 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg border border-border md:hidden"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
        >
          <Menu className="size-4" />
        </button>
      </div>

      {aberto && (
        <nav className="grid gap-1 border-t border-border/60 px-6 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              onClick={() => setAberto(false)}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
