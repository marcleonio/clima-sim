import { useEffect, useRef, useState } from "react";

/**
 * Interpola um número do valor antigo para o novo.
 *
 * A regra que justifica isso existir: anima-se **o que mudou de valor**, nunca
 * **o que apenas apareceu**. Um número que sobe de 640 para 213 comunica "caiu
 * muito" durante a própria transição — a magnitude da mudança vira perceptível
 * sem o leitor precisar ter memorizado o valor anterior. Já um cartão que
 * desliza da direita não comunica nada e atrasa a leitura.
 *
 * Duração curta de propósito: acima de ~250ms, fluidez vira espera. E se a
 * pessoa pediu menos movimento no sistema, o valor troca direto — sem animação
 * e sem `setState` em laço.
 */

const DURACAO_MS = 260;

/** easing de saída: rápido no começo, assenta no fim. */
function suavizar(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefereMenosMovimento(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useNumeroAnimado(alvo: number, casas = 0): number {
  const [valor, setValor] = useState(alvo);

  /*
   * O ponto de partida vem do que está NA TELA, não de um "valor anterior"
   * guardado no início do efeito.
   *
   * A primeira versão fazia `anterior.current = alvo` logo ao entrar no efeito.
   * Sob StrictMode, o React monta, limpa e monta de novo: na segunda passada o
   * ref já valia `alvo`, a comparação `de === alvo` saía cedo, e o `setValor`
   * nunca rodava — o número ficava congelado no valor inicial para sempre.
   * Mantendo o ref sincronizado com o que foi realmente pintado, a segunda
   * passada simplesmente retoma a animação de onde ela estava.
   */
  const pintado = useRef(alvo);

  useEffect(() => {
    const de = pintado.current;
    if (de === alvo) return;

    const irDireto = () => {
      pintado.current = alvo;
      setValor(alvo);
    };

    /*
     * Sem animação quando ela não faria sentido ou não funcionaria.
     *
     * `document.hidden` não é detalhe: o navegador suspende
     * requestAnimationFrame em aba de fundo. Sem esta guarda, quem troca de aba
     * no meio de um filtro volta e encontra o número congelado no valor antigo
     * — que é pior que não ter animação nenhuma.
     */
    if (prefereMenosMovimento() || (typeof document !== "undefined" && document.hidden)) {
      irDireto();
      return;
    }

    const inicio = performance.now();
    const fator = 10 ** casas;
    let quadro = 0;

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_MS);
      const atual = de + (alvo - de) * suavizar(t);
      const arredondado = t < 1 ? Math.round(atual * fator) / fator : alvo;

      pintado.current = arredondado;
      setValor(arredondado);

      if (t < 1) quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);

    // Rede de segurança: se os quadros forem estrangulados (aba escondida no
    // meio do caminho, renderizador ocupado), o valor chega ao alvo mesmo assim.
    const rede = setTimeout(irDireto, DURACAO_MS * 3);

    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(rede);
    };
  }, [alvo, casas]);

  return valor;
}
