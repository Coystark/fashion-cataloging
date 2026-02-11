import { Type } from "@google/genai";
import type { AnalysisEntry, AnalysisUsage } from "@/types/clothing";
import { ai, buildUsage } from "@/lib/gemini";

export interface PriceEstimate {
  precoMinimo: number;
  precoMaximo: number;
  precoSugerido: number;
  justificativa: string;
}

export interface PriceEstimateResult {
  estimate: PriceEstimate;
  usage: AnalysisUsage;
}

const PRICE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    precoMinimo: {
      type: Type.NUMBER,
    },
    precoMaximo: {
      type: Type.NUMBER,
    },
    precoSugerido: {
      type: Type.NUMBER,
    },
    justificativa: {
      type: Type.STRING,
    },
  },
  required: ["precoMinimo", "precoMaximo", "precoSugerido", "justificativa"],
};

function buildPricingPrompt(
  entry: AnalysisEntry,
  qualidade: string,
  marca: string
): string {
  return `Você é um especialista em precificação de moda de segunda mão no mercado brasileiro. Com base nas informações abaixo sobre uma peça de roupa, estime o valor de revenda.

INFORMAÇÕES DO PRODUTO:
- Título: ${entry.titulo_sugerido}
- Descrição: ${entry.descricao_sugerida}
- Categoria: ${entry.categoria}
- Cor: ${entry.cor}
- Corte/Silhueta: ${entry.corte_silhueta}
- Estampa: ${entry.estampa}
- Material: ${entry.material}
- Ocasião: ${entry.ocasiao}
- Comprimento: ${entry.comprimento}
- Gênero: ${entry.genero}
- Detalhes de estilo: ${entry.detalhes_estilo.join(", ")}

INFORMAÇÕES DO USUÁRIO:
- Qualidade/Estado: ${qualidade}
- Marca: ${marca}

REGRAS:
- Considere o mercado brasileiro de revenda de roupas (brechós online, plataformas como Repassa, Enjoei, etc.)
- Leve em conta a marca, qualidade/estado da peça, material, categoria e ocasião de uso
- Marcas premium/luxo devem ter preços significativamente maiores
- Peças em melhor estado conservam mais valor
- Retorne valores em Reais (BRL)
- A justificativa deve ter 2-3 frases explicando o racional do preço

Retorne APENAS um JSON com:
- precoMinimo: valor mínimo estimado (número)
- precoMaximo: valor máximo estimado (número)
- precoSugerido: valor sugerido para venda (número)
- justificativa: explicação do racional de precificação (string)`;
}

export async function estimatePrice(
  entry: AnalysisEntry,
  qualidade: string,
  marca: string
): Promise<PriceEstimateResult> {
  const prompt = buildPricingPrompt(entry, qualidade, marca);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: PRICE_RESPONSE_SCHEMA,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou nenhuma resposta.");

  const estimate: PriceEstimate = JSON.parse(text);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = buildUsage(response.usageMetadata as any);

  return { estimate, usage };
}
