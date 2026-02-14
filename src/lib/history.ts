import type { AnalysisEntry, PriceEstimateEntry } from "@/types/clothing";

const STORAGE_KEY = "clothing-analysis-history";
const PRICE_STORAGE_KEY = "price-estimate-history";

/**
 * Carrega o histórico do localStorage, migrando entries antigos que
 * possuem `imagePreview` (string) para o novo formato `imagePreviews` (string[]).
 */
export function loadHistory(): AnalysisEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any[];
    return parsed.map((entry) => {
      // Migração: campo antigo imagePreview -> imagePreviews
      if (typeof entry.imagePreview === "string" && !entry.imagePreviews) {
        const { imagePreview, ...rest } = entry;
        return { ...rest, imagePreviews: [imagePreview] } as AnalysisEntry;
      }
      return entry as AnalysisEntry;
    });
  } catch {
    return [];
  }
}

export function saveAnalysis(entry: AnalysisEntry): void {
  const history = loadHistory();
  history.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function deleteAnalysis(id: string): void {
  const history = loadHistory().filter((entry) => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/*  Histórico de estimativas de preço                                  */
/* ------------------------------------------------------------------ */

export function loadPriceHistory(): PriceEstimateEntry[] {
  try {
    const raw = localStorage.getItem(PRICE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PriceEstimateEntry[];
  } catch {
    return [];
  }
}

export function savePriceEstimate(entry: PriceEstimateEntry): void {
  const history = loadPriceHistory();
  history.unshift(entry);
  localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(history));
}

export function deletePriceEstimate(id: string): void {
  const history = loadPriceHistory().filter((entry) => entry.id !== id);
  localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(history));
}

export function clearPriceHistory(): void {
  localStorage.removeItem(PRICE_STORAGE_KEY);
}

/**
 * Retorna apenas as estimativas vinculadas a um item (analysisId).
 */
export function loadPriceHistoryForItem(
  analysisId: string
): PriceEstimateEntry[] {
  return loadPriceHistory().filter((e) => e.analysisId === analysisId);
}

/* ------------------------------------------------------------------ */
/*  Média de preço de um item                                          */
/* ------------------------------------------------------------------ */

export interface ItemPriceAverage {
  count: number;
  avgMinimo: number;
  avgSugerido: number;
  avgMaximo: number;
}

/**
 * Calcula a média de precoMinimo, precoSugerido e precoMaximo
 * de um conjunto de estimativas (normalmente filtradas por item).
 * Retorna `null` se a lista estiver vazia.
 */
export function computeItemAverages(
  entries: PriceEstimateEntry[]
): ItemPriceAverage | null {
  if (entries.length === 0) return null;

  let sumMin = 0;
  let sumSug = 0;
  let sumMax = 0;

  for (const e of entries) {
    sumMin += e.precoMinimo;
    sumSug += e.precoSugerido;
    sumMax += e.precoMaximo;
  }

  const count = entries.length;
  return {
    count,
    avgMinimo: sumMin / count,
    avgSugerido: sumSug / count,
    avgMaximo: sumMax / count,
  };
}

/* ------------------------------------------------------------------ */
/*  Histórico de Virtual Try-On                                        */
/* ------------------------------------------------------------------ */

const TRYON_STORAGE_KEY = "tryon-history";

export interface TryOnHistoryItem {
  id: string;
  analysisId: string;
  productImage: string;
  personImage: string;
  resultImage: string;
  estimatedCostUSD: number;
  estimatedCostBRL: number;
  elapsedMs: number;
  createdAt: string;
}

export function loadTryOnHistory(): TryOnHistoryItem[] {
  try {
    const raw = localStorage.getItem(TRYON_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TryOnHistoryItem[];
  } catch {
    return [];
  }
}

export function loadTryOnHistoryForItem(
  analysisId: string
): TryOnHistoryItem[] {
  return loadTryOnHistory().filter((e) => e.analysisId === analysisId);
}

export function saveTryOnEntry(entry: TryOnHistoryItem): void {
  const history = loadTryOnHistory();
  history.unshift(entry);
  localStorage.setItem(TRYON_STORAGE_KEY, JSON.stringify(history));
}

export function deleteTryOnEntry(id: string): void {
  const history = loadTryOnHistory().filter((e) => e.id !== id);
  localStorage.setItem(TRYON_STORAGE_KEY, JSON.stringify(history));
}

export function clearTryOnHistory(): void {
  localStorage.removeItem(TRYON_STORAGE_KEY);
}

/**
 * Redimensiona uma imagem data-URL para no máximo `maxSize` px (lado maior),
 * retornando uma nova data-URL JPEG comprimida para caber no localStorage.
 */
export function resizeImageDataUrl(
  dataUrl: string,
  maxSize = 200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Redimensiona múltiplas imagens data-URL em paralelo.
 */
export function resizeMultipleImages(
  dataUrls: string[],
  maxSize = 200
): Promise<string[]> {
  return Promise.all(dataUrls.map((url) => resizeImageDataUrl(url, maxSize)));
}
