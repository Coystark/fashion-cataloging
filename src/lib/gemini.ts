import { GoogleGenAI, Type } from "@google/genai";
import type { ClothingAnalysis, AnalysisUsage } from "@/types/clothing";

// Gemini 2.5 Flash — preços por 1M tokens (USD)
const PRICE_INPUT_PER_MILLION = 0.15;
const PRICE_OUTPUT_PER_MILLION = 0.6;
const PRICE_THINKING_PER_MILLION = 3.5;
const USD_TO_BRL = 5.8;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({ apiKey: API_KEY });

const CATEGORIAS = [
  "vestido",
  "camiseta",
  "camisa",
  "blusa",
  "body",
  "top/cropped",
  "regata",
  "saia",
  "calça",
  "shorts",
  "bermuda",
  "macacão",
  "jardineira",
  "blazer",
  "jaqueta",
  "casaco",
  "moletom",
  "cardigan",
  "colete",
  "suéter",
  "lingerie",
  "biquíni",
  "pijama",
  "acessório",
  "outro",
] as const;

const CORES = [
  "preto",
  "branco",
  "off-white",
  "bege",
  "creme",
  "marrom",
  "caramelo",
  "cinza",
  "azul-claro",
  "azul-escuro",
  "azul-royal",
  "azul-marinho",
  "verde",
  "verde-militar",
  "verde-claro",
  "vermelho",
  "bordô",
  "rosa",
  "rosa-claro",
  "lilás",
  "roxo",
  "amarelo",
  "laranja",
  "coral",
  "dourado",
  "prateado",
  "estampado/multicolorido",
] as const;

const CORTES = [
  "tubinho",
  "evasê",
  "sereia",
  "envelope",
  "império",
  "chemise",
  "reto",
  "oversized",
  "slim/ajustado",
  "regular",
  "cropped",
  "alongado",
  "trapézio",
  "godê",
  "outro",
] as const;

const DETALHES = [
  "tomara que caia",
  "frente única",
  "um ombro só",
  "com alças",
  "alça fina",
  "manga curta",
  "manga longa",
  "manga 3/4",
  "manga bufante",
  "sem manga",
  "decote V",
  "decote redondo",
  "gola alta",
  "fenda",
  "babados",
  "plissado",
  "drapeado",
  "franzido",
  "renda",
  "bordado",
  "paetê",
  "botões",
  "zíper aparente",
  "cinto/faixa",
  "bolsos",
  "capuz",
  "laço",
  "transparência",
  "recortes",
  "peplum",
  "outro",
] as const;

const ESTAMPAS = [
  "liso",
  "floral",
  "listrado",
  "xadrez",
  "poá/bolinhas",
  "animal print",
  "geométrico",
  "abstrato",
  "tropical",
  "tie-dye",
  "camuflado",
  "étnico",
  "paisley",
  "degradê",
  "outro",
] as const;

const MATERIAIS = [
  "algodão",
  "poliéster",
  "viscose",
  "linho",
  "seda",
  "cetim",
  "chiffon",
  "crepe",
  "renda",
  "tricô/crochê",
  "jeans/denim",
  "couro",
  "couro sintético",
  "camurça",
  "veludo",
  "moletom",
  "malha",
  "tule",
  "organza",
  "neoprene",
  "tweed",
  "lã",
  "náilon",
  "elastano/lycra",
  "outro",
] as const;

const OCASIOES = [
  "casual",
  "trabalho/escritório",
  "festa/evento",
  "esportivo",
  "praia/piscina",
  "noite/balada",
  "formal/cerimônia",
  "dia a dia",
  "loungewear/casa",
  "outro",
] as const;

const COMPRIMENTOS = [
  "mini",
  "curto",
  "médio",
  "midi",
  "longo",
  "maxi",
  "não aplicável",
] as const;

const GENEROS = ["feminino", "masculino", "unissex", "infantil"] as const;

const BASE_PROMPT = `Você é um especialista em catalogação de moda. Analise as imagens fornecidas da peça de roupa (podem ser fotos da frente, costas e zoom no tecido) e retorne APENAS um JSON seguindo estas regras:

titulo_sugerido: Crie um título curto e atrativo para anúncio/catálogo do produto (máximo 80 caracteres). Deve ser descritivo e incluir a categoria, cor principal e um diferencial da peça. Exemplos: "Vestido Midi Preto Tubinho com Fenda", "Camisa Social Listrada Azul Manga Longa", "Blusa Floral Rosa Evasê com Babados".

descricao_sugerida: Crie uma descrição comercial da peça para uso em anúncio/catálogo (2 a 4 frases). Destaque o material, caimento, detalhes de estilo e ocasiões de uso. Use linguagem atrativa e profissional.

categoria: Escolha EXATAMENTE um valor da lista: [${CATEGORIAS.join(", ")}].

cor: Escolha um ou mais valores da lista (separe com " e " se houver mais de uma cor relevante): [${CORES.join(
  ", "
)}].

corte_silhueta: Escolha EXATAMENTE um valor da lista: [${CORTES.join(", ")}].

detalhes_estilo: Retorne uma lista com TODOS os atributos aplicáveis da lista: [${DETALHES.join(
  ", "
)}].

estampa: Escolha EXATAMENTE um valor da lista: [${ESTAMPAS.join(", ")}].

material: Identifique o material/tecido principal da peça. Escolha EXATAMENTE um valor da lista: [${MATERIAIS.join(
  ", "
)}]. Analise a textura, caimento e aparência do tecido nas imagens.

ocasiao: Classifique a ocasião de uso mais adequada. Escolha EXATAMENTE um valor da lista: [${OCASIOES.join(
  ", "
)}].

comprimento: Classifique o comprimento da peça. Escolha EXATAMENTE um valor da lista: [${COMPRIMENTOS.join(
  ", "
)}]. Use "não aplicável" apenas para acessórios ou itens onde comprimento não faz sentido.

genero: Classifique o gênero alvo da peça. Escolha EXATAMENTE um valor da lista: [${GENEROS.join(
  ", "
)}].

IMPORTANTE:
- Considere TODAS as imagens enviadas em conjunto para fazer uma análise mais completa e precisa da peça.
- Use APENAS valores das listas fornecidas acima para os campos com listas. Não invente valores fora das listas.
- Para detalhes_estilo, inclua TODOS os detalhes visíveis na peça, não apenas um.
- O titulo_sugerido e descricao_sugerida são textos livres — seja criativo e comercial.

EXEMPLOS DE SAÍDA:

Exemplo 1 — Vestido de festa preto:
{
  "titulo_sugerido": "Vestido Midi Preto Tubinho com Fenda Elegante",
  "descricao_sugerida": "Vestido tubinho preto em crepe de alta qualidade, perfeito para festas e eventos especiais. Modelo tomara que caia com fenda lateral que confere charme e sofisticação. Comprimento midi ideal para ocasiões formais e semi-formais.",
  "categoria": "vestido",
  "cor": "preto",
  "corte_silhueta": "tubinho",
  "detalhes_estilo": ["tomara que caia", "fenda"],
  "estampa": "liso",
  "material": "crepe",
  "ocasiao": "festa/evento",
  "comprimento": "midi",
  "genero": "feminino"
}

Exemplo 2 — Camisa social masculina listrada:
{
  "titulo_sugerido": "Camisa Social Listrada Azul e Branca Manga Longa",
  "descricao_sugerida": "Camisa social masculina em algodão com estampa listrada em tons de azul-claro e branco. Corte regular com manga longa e fechamento em botões. Ideal para o dia a dia no escritório, combinando elegância e conforto.",
  "categoria": "camisa",
  "cor": "azul-claro e branco",
  "corte_silhueta": "regular",
  "detalhes_estilo": ["manga longa", "botões"],
  "estampa": "listrado",
  "material": "algodão",
  "ocasiao": "trabalho/escritório",
  "comprimento": "médio",
  "genero": "masculino"
}

Exemplo 3 — Blusa feminina floral casual:
{
  "titulo_sugerido": "Blusa Evasê Floral Rosa com Babados e Decote V",
  "descricao_sugerida": "Blusa feminina evasê em viscose com linda estampa floral em tons de rosa e verde. Possui manga curta, decote V e delicados babados que adicionam movimento e feminilidade. Peça versátil, perfeita para looks casuais do dia a dia.",
  "categoria": "blusa",
  "cor": "rosa e verde",
  "corte_silhueta": "evasê",
  "detalhes_estilo": ["manga curta", "decote V", "babados"],
  "estampa": "floral",
  "material": "viscose",
  "ocasiao": "casual",
  "comprimento": "curto",
  "genero": "feminino"
}

FORMATO DE SAÍDA (retorne APENAS o JSON, sem texto adicional):
{
  "titulo_sugerido": "",
  "descricao_sugerida": "",
  "categoria": "",
  "cor": "",
  "corte_silhueta": "",
  "detalhes_estilo": [],
  "estampa": "",
  "material": "",
  "ocasiao": "",
  "comprimento": "",
  "genero": ""
}`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    titulo_sugerido: {
      type: Type.STRING,
    },
    descricao_sugerida: {
      type: Type.STRING,
    },
    categoria: {
      type: Type.STRING,
      enum: [...CATEGORIAS],
    },
    cor: {
      type: Type.STRING,
    },
    corte_silhueta: {
      type: Type.STRING,
      enum: [...CORTES],
    },
    detalhes_estilo: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: [...DETALHES],
      },
    },
    estampa: {
      type: Type.STRING,
      enum: [...ESTAMPAS],
    },
    material: {
      type: Type.STRING,
      enum: [...MATERIAIS],
    },
    ocasiao: {
      type: Type.STRING,
      enum: [...OCASIOES],
    },
    comprimento: {
      type: Type.STRING,
      enum: [...COMPRIMENTOS],
    },
    genero: {
      type: Type.STRING,
      enum: [...GENEROS],
    },
  },
  required: [
    "titulo_sugerido",
    "descricao_sugerida",
    "categoria",
    "cor",
    "corte_silhueta",
    "detalhes_estilo",
    "estampa",
    "ocasiao",
    "genero",
  ],
};

function buildPrompt(userDescription?: string): string {
  if (!userDescription?.trim()) return BASE_PROMPT;

  return `${BASE_PROMPT}

INFORMAÇÃO ADICIONAL DO USUÁRIO:
O usuário descreveu a peça como: "${userDescription.trim()}"
Leve essa descrição em consideração junto com a imagem para classificar corretamente a peça.`;
}

export interface AnalyzeResult {
  analysis: ClothingAnalysis;
  usage: AnalysisUsage;
}

function buildUsage(
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

export async function analyzeClothingImage(
  images: { base64Data: string; mimeType: string }[],
  userDescription?: string
): Promise<AnalyzeResult> {
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
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou nenhuma resposta.");

  const analysis: ClothingAnalysis = JSON.parse(text);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = buildUsage(response.usageMetadata as any);

  return { analysis, usage };
}
