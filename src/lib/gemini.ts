import { GoogleGenAI } from "@google/genai";
import type { ClothingAnalysis } from "@/types/clothing";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({ apiKey: API_KEY });

const BASE_PROMPT = `Você é um especialista em catalogação de moda. Analise as imagens fornecidas da peça de roupa (podem ser fotos da frente, costas e zoom no tecido) e retorne APENAS um JSON seguindo estas regras:

categoria: (ex: vestido, camiseta, calça, body, saia, shorts, blazer, jaqueta, etc.).

cor: A cor predominante da peça (ex: preto, branco, azul, vermelho, rosa, verde, bege, marrom, cinza, amarelo, laranja, roxo, multicolorido, etc.). Se houver mais de uma cor relevante, separe com " e " (ex: "preto e branco").

corte_silhueta: Se for vestido, escolha um valor: [tubinho, evasê, sereia, envelope, império, chemise, reto, outro]. Para outras peças, descreva o corte principal.

detalhes_estilo: Se for vestido, retorne uma lista com os atributos aplicáveis: [tomara que caia, frente única, com alças, manga longa, fenda, babados, plissado, outro]. Para outras peças, liste os detalhes de estilo visíveis.

estampa: (ex: bolinhas, liso, floral, listrado, xadrez).

IMPORTANTE: Considere TODAS as imagens enviadas em conjunto para fazer uma análise mais completa e precisa da peça.

FORMATO DE SAÍDA:
{
  "categoria": "",
  "cor": "",
  "corte_silhueta": "",
  "detalhes_estilo": [],
  "estampa": ""
}`;

function buildPrompt(userDescription?: string): string {
  if (!userDescription?.trim()) return BASE_PROMPT;

  return `${BASE_PROMPT}

INFORMAÇÃO ADICIONAL DO USUÁRIO:
O usuário descreveu a peça como: "${userDescription.trim()}"
Leve essa descrição em consideração junto com a imagem para classificar corretamente a peça.`;
}

export async function analyzeClothingImage(
  images: { base64Data: string; mimeType: string }[],
  userDescription?: string
): Promise<ClothingAnalysis> {
  const prompt = buildPrompt(userDescription);

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType,
    },
  }));

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts],
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
