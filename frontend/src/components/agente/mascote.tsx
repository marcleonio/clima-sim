import { cn } from "@/lib/utils";

/**
 * O mascote do assistente.
 *
 * O assistente é o único ponto da interface que fala em primeira pessoa, e
 * falar em primeira pessoa sem ter rosto é o que faz um chat parecer um
 * formulário.
 *
 * A forma é simples o bastante para funcionar a 20px — que é o tamanho em que
 * ela mais aparece — e o globo é a MESMA circunferência nos quatro estados; o
 * que muda é o que orbita ao redor. Os estados substituem texto de status:
 * "consultando" é o anel girando, não a frase "Consultando os dados…".
 *
 * UM LIMITE QUE VALE REGISTRAR
 *
 * Uma personagem torna o assistente simpático, e simpatia aumenta confiança —
 * inclusive quando ela não é devida. Por isso a regra do produto fica MAIS
 * rígida com mascote, não menos: toda resposta continua mostrando quais
 * ferramentas foram consultadas, e o aviso de conferir a peça antes de
 * protocolar não sai da tela.
 */

export type EstadoMascote = "repouso" | "consultando" | "achado" | "pronto";

export function Mascote({
  estado = "repouso",
  tamanho = 32,
  className,
}: {
  estado?: EstadoMascote;
  tamanho?: number;
  className?: string;
}) {
  const rotulo = {
    repouso: "Assistente do ClimaSim",
    consultando: "Assistente consultando os dados",
    achado: "Assistente com observação sobre esta tela",
    pronto: "Assistente com peça pronta",
  }[estado];

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 56 56"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={rotulo}
    >
      {/* a órbita, que só existe enquanto ele consulta */}
      {estado === "consultando" && (
        <g className="origin-center motion-safe:animate-spin" style={{ animationDuration: "2.4s" }}>
          <ellipse
            cx="28"
            cy="28"
            rx="25"
            ry="9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            opacity="0.55"
            transform="rotate(-22 28 28)"
          />
          <circle cx="50" cy="19.5" r="3" fill="currentColor" />
        </g>
      )}

      {/* o globo — a mesma circunferência nos quatro estados */}
      <circle cx="28" cy="28" r="18" fill="currentColor" opacity="0.14" />
      <circle cx="28" cy="28" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
      <ellipse
        cx="28"
        cy="28"
        rx="7.5"
        ry="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.5"
      />
      <path d="M10 28h36" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />

      {/* um continente, para não parecer uma bola de arame */}
      <path
        d="M20.5 20.5c3-2 6.8-1 7.6 2s-2 4.8-4.8 4.8-4.8-3.8-2.8-6.8z"
        fill="currentColor"
        opacity="0.62"
      />

      {/* os olhos ficam no mesmo lugar sempre: é o que dá continuidade à personagem */}
      <circle cx="22.5" cy="30.5" r="2" fill="currentColor" />
      <circle cx="33.5" cy="30.5" r="2" fill="currentColor" />

      {/* marcador de achado crítico */}
      {estado === "achado" && (
        <g>
          <circle cx="45" cy="13" r="8.5" fill="var(--sev-critico, #8F1D14)" />
          <path d="M45 9v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="45" cy="17.6" r="1.3" fill="#fff" />
        </g>
      )}

      {/* documento pronto */}
      {estado === "pronto" && (
        <g>
          <rect
            x="38"
            y="8"
            width="15"
            height="19"
            rx="2"
            fill="var(--card, #fff)"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M41 14h9M41 18h9M41 22h6"
            stroke="currentColor"
            strokeWidth="1.3"
            opacity="0.7"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
