import { DESCRICOES, esquemas, ferramentas, type NomeFerramenta } from "@/lib/agente/ferramentas";

/**
 * Os provedores de modelo, atrás de uma interface só.
 *
 * O agente foi escrito para a Anthropic e o evento tem chave da Groq. Em vez de
 * trocar um pelo outro — e perder o trabalho quando a chave mudar de novo —, o
 * laço de ferramentas fica aqui, e a escolha do provedor é uma variável de
 * ambiente.
 *
 * O QUE NÃO MUDA COM O PROVEDOR
 *
 * As ferramentas são as mesmas, e continuam sendo a única fonte de fato. Trocar
 * de modelo troca o REDATOR, nunca a evidência: um modelo menor escreve pior,
 * mas não inventa número, porque não é ele que produz número nenhum.
 *
 * Nada de chave sai deste arquivo para o cliente — ele só é importado por
 * `servidor.ts`, que roda em `createServerFn`.
 */

/** Quantas idas e voltas o laço aceita antes de desistir. */
const MAXIMO_DE_VOLTAS = 8;

/*
 * O nível gratuito da Groq dá 8.000 tokens por minuto, e ele conta o
 * `max_completion_tokens` PEDIDO contra o limite — não o usado. Pedir 4.000 de
 * saída para respostas de três parágrafos consumia metade do orçamento do
 * minuto antes de o modelo escrever uma palavra, e a primeira volta de
 * ferramenta já estourava com 429.
 *
 * 1.100 sobra para a resposta mais longa que este agente deve dar. Se um dia
 * faltar, o sintoma é resposta cortada no meio, não erro — e aí se aumenta.
 */
const SAIDA_MAXIMA = 1100;

/** Quantas vezes reagendar diante de um 429 antes de desistir. */
const TENTATIVAS_NO_LIMITE = 3;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Quanto esperar depois de um 429.
 *
 * A Groq diz o tempo exato na mensagem ("try again in 5.2875s"); usar isso é
 * melhor que um backoff cego, que ou espera demais ou bate de novo cedo.
 */
function esperaSugerida(corpo: string, tentativa: number): number {
  const m = corpo.match(/try again in ([\d.]+)s/i);
  if (m) return Math.ceil(Number(m[1]) * 1000) + 250;
  return 2000 * tentativa;
}

export type Provedor = "anthropic" | "groq";

export interface Resultado {
  texto: string;
  ferramentasUsadas: string[];
  /** Qual provedor e modelo responderam — a resposta é rastreável. */
  origem: string;
}

/** Executa uma ferramenta pelo nome, com o registro de quem foi chamada. */
async function executar(nome: string, argumentos: unknown, usadas: string[]): Promise<string> {
  const alvo = ferramentas[nome as NomeFerramenta] as
    | ((entrada: unknown) => Promise<unknown>)
    | undefined;

  if (!alvo) {
    return JSON.stringify({ erro: "ferramenta_desconhecida", nome });
  }

  usadas.push(nome);
  try {
    return JSON.stringify(await alvo(argumentos));
  } catch (erro) {
    // Erro de ferramenta volta como DADO: o modelo precisa poder dizer que
    // aquela consulta falhou, em vez de o laço inteiro morrer.
    return JSON.stringify({
      erro: "falha_na_ferramenta",
      nome,
      detalhe: erro instanceof Error ? erro.message : String(erro),
    });
  }
}

const NOMES = Object.keys(ferramentas) as NomeFerramenta[];

// ------------------------------------------------------------------ Groq

/**
 * Groq expõe a API no formato da OpenAI, então o laço é o clássico:
 * pedir → executar as chamadas → devolver os resultados → repetir.
 *
 * Não há SDK aqui de propósito: são duas formas de mensagem e um POST. Uma
 * dependência a mais só para isso não se paga.
 */
async function comGroq(
  chave: string,
  modelo: string,
  sistema: string,
  mensagens: { role: "user" | "assistant"; content: string }[],
): Promise<Resultado> {
  const tools = NOMES.map((nome) => ({
    type: "function" as const,
    function: {
      name: nome,
      description: DESCRICOES[nome],
      parameters: esquemas[nome],
    },
  }));

  const historico: Record<string, unknown>[] = [
    { role: "system", content: sistema },
    ...mensagens,
  ];

  const usadas: string[] = [];

  for (let volta = 0; volta < MAXIMO_DE_VOLTAS; volta += 1) {
    let resposta: Response | null = null;

    for (let tentativa = 1; tentativa <= TENTATIVAS_NO_LIMITE; tentativa += 1) {
      resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${chave}`,
        },
        body: JSON.stringify({
          model: modelo,
          messages: historico,
          tools,
          tool_choice: "auto",
          temperature: 0.2,
          max_completion_tokens: SAIDA_MAXIMA,
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (resposta.status !== 429) break;

      const aviso = await resposta.text();
      if (tentativa === TENTATIVAS_NO_LIMITE) {
        throw new Error(`Groq 429 após ${tentativa} tentativas: ${aviso.slice(0, 200)}`);
      }
      await dormir(esperaSugerida(aviso, tentativa));
    }

    if (!resposta || !resposta.ok) {
      const corpo = resposta ? await resposta.text() : "sem resposta";
      throw new Error(`Groq ${resposta?.status ?? "?"}: ${corpo.slice(0, 300)}`);
    }

    const corpo = (await resposta.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
      }[];
    };

    const mensagem = corpo.choices?.[0]?.message;
    if (!mensagem) throw new Error("Groq devolveu resposta sem mensagem");

    const chamadas = mensagem.tool_calls ?? [];
    if (!chamadas.length) {
      return {
        texto: (mensagem.content ?? "").trim(),
        ferramentasUsadas: [...new Set(usadas)],
        origem: `groq/${modelo}`,
      };
    }

    historico.push(mensagem as unknown as Record<string, unknown>);

    for (const chamada of chamadas) {
      let argumentos: unknown = {};
      try {
        argumentos = JSON.parse(chamada.function.arguments || "{}");
      } catch {
        // Argumento malformado é problema do modelo, não do laço: devolve o
        // erro como resultado e deixa ele corrigir na volta seguinte.
        argumentos = {};
      }

      historico.push({
        role: "tool",
        tool_call_id: chamada.id,
        content: await executar(chamada.function.name, argumentos, usadas),
      });
    }
  }

  return {
    texto:
      "A consulta exigiu mais idas e voltas do que o limite permite. Refaça a pergunta de forma " +
      "mais específica — por exemplo, citando o ente ou o componente.",
    ferramentasUsadas: [...new Set(usadas)],
    origem: `groq/${modelo}`,
  };
}

// ------------------------------------------------------------------ Anthropic

async function comAnthropic(
  chave: string,
  modelo: string,
  sistema: string,
  mensagens: { role: "user" | "assistant"; content: string }[],
): Promise<Resultado> {
  // JSON Schema em vez do helper de Zod: o `betaZodTool` exige os tipos
  // internos do Zod v4 e o projeto está no v3.
  const [{ default: Anthropic }, { betaTool }] = await Promise.all([
    import("@anthropic-ai/sdk"),
    import("@anthropic-ai/sdk/helpers/beta/json-schema"),
  ]);

  const usadas: string[] = [];

  const definidas = NOMES.map((nome) =>
    betaTool({
      name: nome,
      description: DESCRICOES[nome],
      inputSchema: esquemas[nome] as never,
      run: async (entrada: unknown) => executar(nome, entrada, usadas),
    }),
  );

  const resposta = await new Anthropic({ apiKey: chave }).beta.messages.toolRunner({
    model: modelo,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    // O sistema é byte a byte idêntico entre requisições: é o prefixo que vale
    // a pena cachear.
    system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
    tools: definidas,
    messages: mensagens,
  });

  const texto = resposta.content
    .filter((bloco): bloco is { type: "text"; text: string } & typeof bloco => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("\n\n")
    .trim();

  return { texto, ferramentasUsadas: [...new Set(usadas)], origem: `anthropic/${modelo}` };
}

// ------------------------------------------------------------------ escolha

export interface Escolha {
  provedor: Provedor;
  chave: string;
  modelo: string;
}

/**
 * Qual provedor usar, a partir do ambiente.
 *
 * Groq primeiro quando as duas chaves existirem: é a que o evento tem, e a
 * ordem explícita evita a surpresa de uma chave esquecida no ambiente decidir
 * por quem opera.
 */
export function escolherProvedor(ambiente: Record<string, string | undefined>): Escolha | null {
  const groq = ambiente["GROQ_API_KEY"];
  if (groq) {
    return {
      provedor: "groq",
      chave: groq,
      modelo: ambiente["GROQ_MODELO"] ?? "openai/gpt-oss-120b",
    };
  }

  const anthropic = ambiente["ANTHROPIC_API_KEY"];
  if (anthropic) {
    return {
      provedor: "anthropic",
      chave: anthropic,
      modelo: ambiente["ANTHROPIC_MODELO"] ?? "claude-opus-5",
    };
  }

  return null;
}

export async function perguntar(
  escolha: Escolha,
  sistema: string,
  mensagens: { role: "user" | "assistant"; content: string }[],
): Promise<Resultado> {
  return escolha.provedor === "groq"
    ? comGroq(escolha.chave, escolha.modelo, sistema, mensagens)
    : comAnthropic(escolha.chave, escolha.modelo, sistema, mensagens);
}
