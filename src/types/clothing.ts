export interface ClothingAnalysis {
  categoria: string;
  cor: string;
  corte_silhueta: string;
  detalhes_estilo: string[];
  estampa: string;
}

export interface AnalysisEntry extends ClothingAnalysis {
  id: string;
  imagePreview: string;
  analyzedAt: string;
}
