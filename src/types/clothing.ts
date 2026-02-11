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
