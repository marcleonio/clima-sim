import { Link } from "@tanstack/react-router";

/** Alvo de toque de 44px sem inchar o desenho da lista. */
const LINK = "inline-flex min-h-11 items-center hover:underline";

export function SiteFooter() {
  return (
    <footer className="canopy mt-16 text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">ClimaSim</p>
          <p className="mt-2 max-w-prose text-sm opacity-80">
            Do dado público à peça de cobrança: transforma os pareceres de auditoria do Painel
            ClimaBrasil em ofícios, requerimentos e planos de providências prontos para protocolar.
          </p>
        </div>

        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest opacity-70">
            Navegação
          </p>
          <ul className="opacity-90">
            <li className="flex">
              <Link to="/painel" className={LINK}>
                Painel nacional
              </Link>
            </li>
            <li className="flex">
              <Link to="/achados" className={LINK}>
                Consultar um ente
              </Link>
            </li>
            <li className="flex">
              <Link to="/metodologia" className={LINK}>
                Metodologia
              </Link>
            </li>
            <li className="flex">
              <Link to="/impacto" className={LINK}>
                Impacto e público
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest opacity-70">
            Fontes de dados
          </p>
          <ul className="opacity-90">
            <li className="flex">
              <a
                href="https://sites.tcu.gov.br/climatonbrasil/"
                target="_blank"
                rel="noreferrer"
                className={LINK}
              >
                Climaton Brasil · TCU
              </a>
            </li>
            <li className="flex">
              <a
                href="https://climatescanner.org/pt/inicio/"
                target="_blank"
                rel="noreferrer"
                className={LINK}
              >
                ClimateScanner
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15 py-5 text-center text-xs opacity-70">
        ClimaSim · dossiês de evidência a partir dos dados do Painel ClimaBrasil
      </div>
    </footer>
  );
}
