import type { AnalysisEntry } from "@/types/clothing";

const STORAGE_KEY = "clothing-analysis-history";

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

/**
 * Redimensiona uma imagem data-URL para no máximo `maxSize` px (lado maior),
 * retornando uma nova data-URL JPEG comprimida para caber no localStorage.
 */
export function resizeImageDataUrl(
  dataUrl: string,
  maxSize = 200
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
      resolve(canvas.toDataURL("image/jpeg", 0.7));
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
