import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentoDialog } from "@/components/achado/documento-dialog";
import type { Achado, Ente } from "@/lib/achados";
import { gerarDocumento } from "@/lib/documentos";

const ACHADO: Achado = {
  c: "P5",
  i: "A",
  nome: "Defesa civil e risco de desastre",
  eixo: "Políticas públicas",
  lei: "Política Nacional de Proteção e Defesa Civil (Lei 12.608/2012)",
  txt: "Não há nada à nível municipal que considere os riscos climáticos.",
};

const ENTE: Ente = {
  tipo: "Município",
  id: 1400100,
  pop: 436_591,
  tot: 44,
  lac: 43,
  mat: 8.3,
  rank: 1,
  eixos: {},
  comps: {},
  achados: [ACHADO],
};

function documento(tipo: Parameters<typeof gerarDocumento>[0] = "oficio") {
  return gerarDocumento(tipo, {
    nomeEnte: "Boa Vista",
    ente: ENTE,
    achados: [ACHADO],
    snapshot: "2025-09-12",
    versao: "Versão de Avaliação 2025",
    emitidoEm: new Date("2026-08-22T12:00:00Z"),
  });
}

describe("DocumentoDialog", () => {
  it("não renderiza nada sem documento", () => {
    const { container } = render(
      <DocumentoDialog documento={null} aberto={false} onFechar={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra título, protocolo e hash de conferência", () => {
    const doc = documento();
    render(<DocumentoDialog documento={doc} aberto onFechar={vi.fn()} />);

    // O DialogTitle acessível repete o título visível de propósito; basta existir.
    expect(screen.getAllByRole("heading", { name: /ofício de requisição/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(doc.protocolo.sha)).length).toBeGreaterThan(0);
  });

  it("mostra o achado com a base normativa e o parecer da auditoria", () => {
    render(<DocumentoDialog documento={documento()} aberto onFechar={vi.fn()} />);

    expect(screen.getByText(/P5A — Defesa civil/)).toBeInTheDocument();
    expect(screen.getByText(/Lei 12\.608\/2012/)).toBeInTheDocument();
    expect(screen.getByText(/não há nada à nível municipal/i)).toBeInTheDocument();
  });

  it("cita a fonte oficial dos dados no rodapé", () => {
    render(<DocumentoDialog documento={documento()} aberto onFechar={vi.fn()} />);

    expect(screen.getAllByText(/Painel ClimaBrasil/).length).toBeGreaterThan(0);
  });

  it("oferece imprimir e baixar em PDF", () => {
    render(<DocumentoDialog documento={documento()} aberto onFechar={vi.fn()} />);

    expect(screen.getByRole("button", { name: /imprimir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /baixar pdf/i })).toBeInTheDocument();
  });

  it("no plano de providências, abre campos em branco para o gestor preencher", () => {
    render(<DocumentoDialog documento={documento("plano")} aberto onFechar={vi.fn()} />);

    expect(screen.getByText(/Causa identificada/i)).toBeInTheDocument();
  });
});
