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

function buildPricingPrompt(
  entry: AnalysisEntry,
  qualidade: string,
  marca: string
): string {
  return `Você é um especialista em precificação de moda de segunda mão no mercado brasileiro. Com base nas informações abaixo sobre uma peça de roupa, estime o valor de revenda.

IMPORTANTE: Use a ferramenta de busca do Google (Google Search) para pesquisar preços reais e atualizados desta peça ou de peças similares em plataformas brasileiras de revenda como Repassa, Enjoei, Troc, OLX, Mercado Livre, e brechós online. Busque por "${marca} ${
    entry.categoria
  }" e termos relacionados para encontrar uma base de valores reais do mercado.

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
- Pesquise na internet preços reais de peças iguais ou similares à venda em brechós e plataformas de revenda brasileiras
- Use os preços encontrados online como base principal para sua estimativa
- Considere o mercado brasileiro de revenda de roupas (brechós online, plataformas como Repassa, Enjoei, etc.)
- Leve em conta a marca, qualidade/estado da peça, material, categoria e ocasião de uso
- Marcas premium/luxo devem ter preços significativamente maiores
- Peças em melhor estado conservam mais valor
- Retorne valores em Reais (BRL)
- A justificativa deve ter 2-3 frases explicando o racional do preço, mencionando os valores de referência encontrados na internet quando disponíveis

Retorne APENAS um objeto JSON puro (sem markdown, sem \`\`\`, sem texto antes ou depois) com:
- precoMinimo: valor mínimo estimado (número)
- precoMaximo: valor máximo estimado (número)
- precoSugerido: valor sugerido para venda (número)
- justificativa: explicação do racional de precificação, citando referências de preços encontrados online quando possível (string)

Exemplo de formato esperado:
{"precoMinimo": 50, "precoMaximo": 120, "precoSugerido": 80, "justificativa": "Texto aqui"}`;
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
      tools: [{ googleSearch: {} }],
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou nenhuma resposta.");

  // Extrai o JSON da resposta (pode vir envolvido em ```json ... ```)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Não foi possível extrair JSON da resposta.");

  const estimate: PriceEstimate = JSON.parse(jsonMatch[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = buildUsage(response.usageMetadata as any);

  return { estimate, usage };
}
