import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ComponenteHeatmap, degrauDeficit } from "@/components/achado/componente-heatmap";
import type { Ente } from "@/lib/achados";

const NOMES = {
  P5: "Defesa civil e risco de desastre",
  G1: "Quadro legal e regulatório",
  F3: "Mobilização de investimentos privados",
};

const NACIONAL = {
  P5: { m: 41.3, l: 35.8 },
  G1: { m: 68.6, l: 13.1 },
  F3: { m: 27.3, l: 56 },
};

/** Amplitude alta entre componentes: a grade tem calor para mostrar. */
const VARIADO: Ente["comps"] = {
  G1: { t: 3, l: 0, m: 88.9 },
  F3: { t: 2, l: 1, m: 16.7 },
  P5: { t: 3, l: 0, m: 55.6 },
};

/** Amplitude quase nula: os cartões diriam todos a mesma coisa. */
const UNIFORME: Ente["comps"] = {
  G1: { t: 3, l: 3, m: 0 },
  F3: { t: 2, l: 2, m: 0 },
  P5: { t: 3, l: 3, m: 0 },
};

function ente(comps: Ente["comps"]): Ente {
  return {
    tipo: "Estado",
    id: 12,
    pop: 906_876,
    tot: 45,
    lac: 2,
    mat: 71.9,
    rank: 40,
    eixos: {},
    comps,
    achados: [],
  };
}

describe("degrauDeficit", () => {
  it("dá degrau próprio ao zero — 'nada demonstrado' não é 'quase nada'", () => {
    // m === 0 significa que todo requisito do componente saiu como "Sem
    // progresso". É a condição que o produto existe para achar.
    expect(degrauDeficit(0)).toBe(5);
    expect(degrauDeficit(11.1)).toBe(4);
  });

  it("mapeia cada valor canônico da escala oficial sem ficar em cima de fronteira", () => {
    const esperado: Array<[number, number]> = [
      [0, 5],
      [11.1, 4],
      [22.2, 4],
      [33.3, 3],
      [44.4, 3],
      [50, 2],
      [55.6, 2],
      [58.3, 2],
      [66.7, 1],
      [77.8, 1],
      [83.3, 1],
      [88.9, 0],
      [100, 0],
    ];

    for (const [maturidade, degrau] of esperado) {
      expect(degrauDeficit(maturidade), `m=${maturidade}`).toBe(degrau);
    }
  });

  it("é monotônica: mais maturidade nunca produz degrau pior", () => {
    let anterior = degrauDeficit(0);
    for (let m = 1; m <= 100; m += 1) {
      const atual = degrauDeficit(m);
      expect(atual, `m=${m}`).toBeLessThanOrEqual(anterior);
      anterior = atual;
    }
  });

  it("prende valores fora da faixa em vez de estourar a rampa", () => {
    expect(degrauDeficit(-40)).toBe(5);
    expect(degrauDeficit(140)).toBe(0);
  });
});

describe("ComponenteHeatmap", () => {
  it("não renderiza nada quando o ente não tem componentes", () => {
    const { container } = render(
      <ComponenteHeatmap ente={ente({})} nomes={NOMES} nacional={NACIONAL} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("ordena do mais frágil para o mais maduro — o olho cai no problema primeiro", () => {
    render(<ComponenteHeatmap ente={ente(VARIADO)} nomes={NOMES} nacional={NACIONAL} />);

    const ordem = screen
      .getAllByRole("listitem")
      .map((li) => li.textContent?.match(/^(G1|F3|P5)/)?.[1]);

    expect(ordem).toEqual(["F3", "P5", "G1"]);
  });

  it("não deixa a cor trabalhar sozinha: o valor sai em número e em barra", () => {
    render(<ComponenteHeatmap ente={ente(VARIADO)} nomes={NOMES} nacional={NACIONAL} />);

    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /maturidade 17 de 100/i })).toBeInTheDocument();
    expect(screen.getByText("1/2 sem progresso")).toBeInTheDocument();
  });

  it("mostra a distância para a média nacional com direção", () => {
    render(<ComponenteHeatmap ente={ente(VARIADO)} nomes={NOMES} nacional={NACIONAL} />);

    // 16,7 contra 27,3 do país → 11 pontos abaixo.
    expect(screen.getByText(/▼ 11/)).toBeInTheDocument();
  });

  it("troca a grade por lista compacta quando não há variação para mostrar", () => {
    const { rerender } = render(
      <ComponenteHeatmap ente={ente(VARIADO)} nomes={NOMES} nacional={NACIONAL} />,
    );
    expect(screen.getByText(/do mais frágil ao mais maduro/i)).toBeInTheDocument();

    rerender(<ComponenteHeatmap ente={ente(UNIFORME)} nomes={NOMES} nacional={NACIONAL} />);
    expect(screen.getByText(/variam pouco entre si/i)).toBeInTheDocument();
    // a informação continua toda lá, só ocupando menos espaço
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("sem onFiltrar, as células não fingem ser clicáveis", () => {
    render(<ComponenteHeatmap ente={ente(VARIADO)} nomes={NOMES} nacional={NACIONAL} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("com onFiltrar, clicar numa célula filtra por ela e clicar de novo limpa", async () => {
    const aoFiltrar = vi.fn();
    const usuario = userEvent.setup();

    const { rerender } = render(
      <ComponenteHeatmap
        ente={ente(VARIADO)}
        nomes={NOMES}
        nacional={NACIONAL}
        onFiltrar={aoFiltrar}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: /Mobilização de investimentos/i }));
    expect(aoFiltrar).toHaveBeenCalledWith("F3");

    // já filtrado por F3, o mesmo clique limpa
    rerender(
      <ComponenteHeatmap
        ente={ente(VARIADO)}
        nomes={NOMES}
        nacional={NACIONAL}
        filtro="F3"
        onFiltrar={aoFiltrar}
      />,
    );
    await usuario.click(screen.getByRole("button", { name: /Mobilização de investimentos/i }));
    expect(aoFiltrar).toHaveBeenLastCalledWith(null);
  });

  it("marca a célula filtrada para leitor de tela", () => {
    render(
      <ComponenteHeatmap
        ente={ente(VARIADO)}
        nomes={NOMES}
        nacional={NACIONAL}
        filtro="F3"
        onFiltrar={vi.fn()}
      />,
    );

    const alvo = screen.getByRole("button", { name: /Mobilização de investimentos/i });
    expect(alvo).toHaveAttribute("aria-pressed", "true");
  });
});
