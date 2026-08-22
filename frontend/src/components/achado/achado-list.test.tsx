import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AchadoList } from "@/components/achado/achado-list";
import type { Achado } from "@/lib/achados";

const ACHADOS: Achado[] = [
  {
    c: "F1",
    i: "A",
    nome: "Finanças e gastos públicos",
    eixo: "Financiamento",
    lei: "Lei nº 14.133/2021",
    txt: "Não há previsão específica no PPA.",
  },
  {
    c: "P5",
    i: "A",
    nome: "Defesa civil e risco de desastre",
    eixo: "Políticas públicas",
    lei: "Política Nacional de Proteção e Defesa Civil (Lei 12.608/2012)",
    txt: "Não há nada à nível municipal que considere riscos climáticos.",
  },
  {
    c: "G1",
    i: "B",
    nome: "Quadro legal e regulatório",
    eixo: "Governança",
    lei: "CF Artigos 24; 30 e 225",
    txt: "Não foi identificada legislação climática municipal.",
  },
];

function montar(props: Partial<React.ComponentProps<typeof AchadoList>> = {}) {
  const onAlternar = vi.fn();
  const onSelecionarVarios = vi.fn();
  render(
    <AchadoList
      achados={ACHADOS}
      selecionados={new Set()}
      onAlternar={onAlternar}
      onSelecionarVarios={onSelecionarVarios}
      {...props}
    />,
  );
  return { onAlternar, onSelecionarVarios };
}

describe("AchadoList", () => {
  it("lista os achados com defesa civil no topo, por ser risco de vida", () => {
    montar();
    const itens = screen.getAllByRole("listitem");

    expect(within(itens[0]!).getByText("P5")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando o ente não tem lacunas", () => {
    montar({ achados: [] });

    expect(screen.getByText(/nenhum requisito sem progresso/i)).toBeInTheDocument();
  });

  it("mantém o parecer da auditoria oculto até o usuário abrir o achado", async () => {
    const user = userEvent.setup();
    montar();

    expect(screen.queryByText(/não há previsão específica no ppa/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /finanças e gastos públicos/i }));

    expect(screen.getByText(/não há previsão específica no ppa/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ler o parecer completo/i })).toBeInTheDocument();
  });

  it("mostra a base normativa junto com o parecer", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole("button", { name: /defesa civil/i }));

    expect(screen.getByText(/Lei 12.608\/2012/)).toBeInTheDocument();
  });

  it("avisa o pai quando um achado é marcado", async () => {
    const user = userEvent.setup();
    const { onAlternar } = montar();

    await user.click(screen.getByRole("button", { name: /defesa civil/i }));
    await user.click(screen.getByRole("checkbox", { name: /selecionar requisito P5A/i }));

    expect(onAlternar).toHaveBeenCalledWith("P5A");
  });

  it("filtra por eixo", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole("button", { name: "Governança" }));

    expect(screen.getByText("Quadro legal e regulatório")).toBeInTheDocument();
    expect(screen.queryByText("Defesa civil e risco de desastre")).not.toBeInTheDocument();
  });

  it("filtra apenas os requisitos com risco de vida", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole("button", { name: /risco de vida/i }));

    expect(screen.getByText("Defesa civil e risco de desastre")).toBeInTheDocument();
    expect(screen.queryByText("Finanças e gastos públicos")).not.toBeInTheDocument();
  });

  it("informa quando a combinação de filtros não devolve nada", async () => {
    const user = userEvent.setup();
    montar();

    // Financiamento não tem requisito crítico à vida: a interseção é vazia.
    await user.click(screen.getByRole("button", { name: "Financiamento" }));
    await user.click(screen.getByRole("button", { name: /risco de vida/i }));

    expect(screen.getByText(/nenhum achado com esses filtros/i)).toBeInTheDocument();
  });

  it("não oferece o filtro de risco de vida quando não há requisito crítico", () => {
    montar({ achados: [ACHADOS[0]!] });

    expect(screen.queryByRole("button", { name: /risco de vida/i })).not.toBeInTheDocument();
  });

  it("seleciona de uma vez todos os achados visíveis", async () => {
    const user = userEvent.setup();
    const { onSelecionarVarios } = montar();

    await user.click(screen.getByRole("button", { name: /selecionar todos/i }));

    expect(onSelecionarVarios).toHaveBeenCalledWith(expect.arrayContaining(["P5A", "F1A", "G1B"]));
  });

  it("mostra quem já resolveu o requisito, com a prática que a auditoria registrou", async () => {
    const user = userEvent.setup();
    montar({
      referencias: {
        P5A: [
          {
            ente: "Minas Gerais",
            tipo: "Estado",
            txt: "Plano estadual de contingência com mapeamento de risco climático.",
          },
        ],
      },
    });

    await user.click(screen.getByRole("button", { name: /defesa civil/i }));
    await user.click(screen.getByRole("button", { name: /ler o parecer completo/i }));

    expect(screen.getByText(/quem já resolveu/i)).toBeInTheDocument();
    expect(screen.getByText("Minas Gerais")).toBeInTheDocument();
    expect(screen.getByText(/plano estadual de contingência/i)).toBeInTheDocument();
  });

  it("nunca sugere o próprio ente como referência para si mesmo", async () => {
    const user = userEvent.setup();
    montar({
      nomeEnte: "Boa Vista",
      referencias: { P5A: [{ ente: "Boa Vista", tipo: "Município", txt: "irrelevante" }] },
    });

    await user.click(screen.getByRole("button", { name: /defesa civil/i }));
    await user.click(screen.getByRole("button", { name: /ler o parecer completo/i }));

    expect(screen.queryByText(/quem já resolveu/i)).not.toBeInTheDocument();
  });

  it("oferece limpar a seleção quando tudo já está marcado", async () => {
    const user = userEvent.setup();
    const { onSelecionarVarios } = montar({ selecionados: new Set(["P5A", "F1A", "G1B"]) });

    await user.click(screen.getByRole("button", { name: /limpar seleção/i }));

    expect(onSelecionarVarios).toHaveBeenCalledWith([]);
  });
});
