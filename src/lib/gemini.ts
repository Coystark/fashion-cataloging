import { GoogleGenAI } from "@google/genai";
import type { ClothingAnalysis } from "@/types/clothing";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = `Você é um especialista em catalogação de moda. Analise a imagem e retorne APENAS um JSON seguindo estas regras:

categoria: (ex: vestido, camiseta, calça).

corte_silhueta: Se for vestido, escolha um valor: [tubinho, evasê, sereia, envelope, império, chemise, reto, outro]. Para outras peças, descreva o corte principal.

detalhes_estilo: Se for vestido, retorne uma lista com os atributos aplicáveis: [tomara que caia, frente única, com alças, manga longa, fenda, babados, plissado, outro]. Para outras peças, liste os detalhes de estilo visíveis.

estampa: (ex: bolinhas, liso, floral, listrado, xadrez).

material_visual: (ex: jeans, malha, tweed, couro, seda).

FORMATO DE SAÍDA:
{
  "categoria": "",
  "corte_silhueta": "",
  "detalhes_estilo": [],
  "estampa": "",
  "material_visual": ""
}`;

export async function analyzeClothingImage(
  base64Data: string,
  mimeType: string
): Promise<ClothingAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  const parsed: ClothingAnalysis = JSON.parse(text!);

  return parsed;
}
