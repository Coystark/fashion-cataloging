import { GoogleGenAI } from "@google/genai";
import type { AnalysisUsage } from "@/types/clothing";

// Gemini 2.5 Flash — preços por 1M tokens (USD)
const PRICE_INPUT_PER_MILLION = 0.15;
const PRICE_OUTPUT_PER_MILLION = 0.6;
const PRICE_THINKING_PER_MILLION = 3.5;
const USD_TO_BRL = 5.8;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export function buildUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any> | undefined
): AnalysisUsage {
  const promptTokens = Number(meta?.promptTokenCount ?? 0);
  const candidatesTokens = Number(meta?.candidatesTokenCount ?? 0);
  const thoughtsTokens = Number(meta?.thoughtsTokenCount ?? 0);
  const totalTokens = Number(meta?.totalTokenCount ?? 0);

  // Tokens de saída "reais" (sem thinking)
  const outputTokens = candidatesTokens - thoughtsTokens;

  const costUSD =
    (promptTokens / 1_000_000) * PRICE_INPUT_PER_MILLION +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_MILLION +
    (thoughtsTokens / 1_000_000) * PRICE_THINKING_PER_MILLION;

  return {
    promptTokenCount: promptTokens,
    candidatesTokenCount: candidatesTokens,
    totalTokenCount: totalTokens,
    thoughtsTokenCount: thoughtsTokens,
    estimatedCostUSD: costUSD,
    estimatedCostBRL: costUSD * USD_TO_BRL,
  };
}
