export interface ClothingAnalysis {
  titulo_sugerido: string;
  descricao_sugerida: string;
  categoria: string;
  cor: string;
  corte_silhueta: string;
  detalhes_estilo: string[];
  estampa: string;
  material: string;
  ocasiao: string;
  comprimento: string;
  genero: string;
  condicao?: string;
  marca?: string;
}

export interface AnalysisUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  thoughtsTokenCount: number;
  estimatedCostUSD: number;
  estimatedCostBRL: number;
}

export interface AnalysisEntry extends ClothingAnalysis {
  id: string;
  imagePreviews: string[];
  analyzedAt: string;
  usage?: AnalysisUsage;
}

export interface PriceEstimateEntry {
  id: string;
  analysisId: string;
  categoria: string;
  marca: string;
  qualidade: string;
  tituloSugerido: string;
  precoMinimo: number;
  precoMaximo: number;
  precoSugerido: number;
  justificativa: string;
  estimatedAt: string;
}
