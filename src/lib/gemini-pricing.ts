import type { AnalysisEntry, AnalysisUsage } from "@/types/clothing";
import { ai, buildUsage } from "@/lib/gemini";

export interface PriceEstimate {
  min_price: number;
  max_price: number;
  suggested_price: number;
  justification: string;
}

export interface PriceEstimateResult {
  estimate: PriceEstimate;
  usage: AnalysisUsage;
}
function buildPricingPrompt(entry: AnalysisEntry): string {
  // Extraímos os materiais para facilitar a leitura da IA
  const compositionStr =
    (entry.composition ?? [])
      .map((c) => `${c.fiber} ${c.percentage}%`)
      .join(", ") || "não identificada";

  const marca = entry.brand || "sem marca";

  return `You are a specialist in the Brazilian second-hand fashion market. Your goal is to provide a precise price estimation based on real-time market data.

### STEP 1: MARKET RESEARCH (MANDATORY)
Use the Google Search tool to find current prices for: "${
    entry.suggestedTitle
  }" and similar items from the same brand. 
Target platforms: Enjoei, Repassa, Troc, Mercado Livre, and OLX. 
Identify the price range (min/max) currently being asked for this type of garment.

### STEP 2: PRODUCT CONTEXT
- **Title:** ${entry.suggestedTitle}
- **Brand:** ${marca}
- **Condition:** ${entry.condition}
- **Category:** ${entry.categories.main} (${entry.categories.sub.join(", ")})
- **Details:** ${entry.color.pattern.join(", ")}, ${
    entry.shape?.join(", ") || "N/A"
  }, ${entry.fit?.join(", ") || "N/A"}
- **Composition:** ${compositionStr}
- **Aesthetics:** ${entry.aesthetics.join(", ")}

### STEP 3: PRICING LOGIC
1. **Reference Base:** Start with the prices found during your Google Search.
2. **Brand Weight:** Adjust based on the brand's market position (Mass market, Premium, or Luxury).
3. **Depreciation:** Apply discounts based on the provided quality/condition.
4. **Suggested Price:** Define a value that balances fast-selling potential with fair market value.

### STEP 4: OUTPUT RULES
- All currency values must be in BRL (numeric).
- The 'justification' must be in **Portuguese (pt-BR)**, explaining the logic and citing the price references found online.
- RETURN ONLY A RAW JSON OBJECT. NO MARKDOWN, NO PREAMBLE.

### OUTPUT SCHEMA (JSON)
{
  "min_price": number,
  "max_price": number,
  "suggested_price": number,
  "justification": "string (in pt-BR)"
}

### EXAMPLE OUTPUT:
{"min_price": 80, "max_price": 150, "suggested_price": 110, "justification": "Com base em peças similares da Farm encontradas no Enjoei e Repassa, os valores variam entre R$ 90 e R$ 180. Considerando o estado 'muito bom' da peça e sua composição em viscose, sugerimos R$ 110 para uma venda competitiva."}`;
}

export async function estimatePrice(
  entry: AnalysisEntry
): Promise<PriceEstimateResult> {
  const prompt = buildPricingPrompt(entry);

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
