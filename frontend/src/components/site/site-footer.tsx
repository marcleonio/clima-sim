import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="canopy mt-16 text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">ClimaSim</p>
          <p className="mt-2 text-sm opacity-80">
            Inteligência preditiva para políticas climáticas: transforma dados estáticos de
            auditoria em uma ferramenta viva de planejamento público.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-70">
            Navegação
          </p>
          <ul className="space-y-2 opacity-90">
            <li>
              <Link to="/simulador">Simulador de cenários</Link>
            </li>
            <li>
              <Link to="/metodologia">Metodologia OLS</Link>
            </li>
            <li>
              <Link to="/impacto">Impacto e público</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-70">
            Fontes de dados
          </p>
          <ul className="space-y-2 opacity-90">
            <li>
              <a href="https://sites.tcu.gov.br/climatonbrasil/" target="_blank" rel="noreferrer">
                Climaton Brasil · TCU
              </a>
            </li>
            <li>
              <a href="https://climatescanner.org/pt/inicio/" target="_blank" rel="noreferrer">
                ClimateScanner
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 py-5 text-center text-xs opacity-70">
        ClimaSim · simulação preditiva de políticas climáticas a partir dos dados do Painel
        ClimaBrasil
      </div>
    </footer>
  );
}
