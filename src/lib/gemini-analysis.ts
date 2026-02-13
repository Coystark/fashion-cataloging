import { Type } from "@google/genai";
import type { GarmentClassification, AnalysisUsage } from "@/types/clothing";
import {
  Department,
  MainCategory,
  SubCategory,
  Shape,
  Fit,
  SleeveLength,
  SleeveType,
  SleeveConstruction,
  Neckline,
  Closure,
  Aesthetic,
  Occasion,
  Condition,
  BackDetail,
  Finish,
  Length,
  Color,
  Pattern,
  FabricFiber,
  PocketType,
} from "@/types/clothing";
import { ai, buildUsage } from "@/lib/gemini";

// Helper to extract enum values as string[]
function enumValues<T extends Record<string, string>>(e: T): string[] {
  return Object.values(e);
}

const BASE_PROMPT = `You are a professional fashion curator and cataloging expert for a premium second-hand store. Your task is to analyze garment images and generate high-quality metadata.

### 1. CONDITIONAL FIELD RULES (CRITICAL)
- **Top-Half Items (Dresses, Shirts, Jackets):** All fields are relevant.
- **Bottom-Half Items (Pants, Skirts, Shorts):** You MUST OMIT the 'sleeve', 'neckline', and 'backDetails' keys from the JSON. They are not applicable.
- **Accessories & Shoes:** OMIT 'sleeve', 'neckline', 'backDetails', 'shape', and 'fit'. Focus exclusively on 'color', 'finish', 'composition', and 'aesthetics'.
- **Pockets:** Always include this object. If no pockets are found, set 'has_pockets' to false, 'quantity' to 0, and 'types' to ["none"].

### 2. STYLE & TECHNICAL GUIDELINES
- **Aesthetic Mapping:** Be comprehensive. A single vintage item can be 'classic', 'vintage', and 'minimalist' simultaneously.
- **Sleeve Construction:** - Use 'dropped' if the shoulder seam sits below the natural shoulder line.
    - Use 'raglan' if the seam extends diagonally from the neckline to the underarm.
- **Shape vs. Fit:** 'Shape' is the geometric cut (e.g., a-line). 'Fit' is the relation to the body (e.g., oversized).

### 3. COMPOSITION & CONDITION
- **Label Priority:** If a fabric composition label is visible, extract the exact percentages.
- **Visual Estimation:** If no label is visible, estimate based on texture: 
    - Shine/Fluidity -> 'polyester' or 'viscose'.
    - Matte/Structured -> 'cotton' or 'linen'.
    - *Constraint:* The sum of percentages in 'composition' MUST equal 100.
- **Condition Grading:** - 'excellent': No signs of wear.
    - 'very_good': Minor washing wear, no visible flaws.
    - 'good': Visible signs of use (minor pilling/fading), but no holes/stains.

### 4. COPYWRITING (Output in pt-BR)
- **suggestedTitle:** Max 80 characters. Format: [Garment Type] + [Brand if visible] + [Main Feature] + [Color]. Write in Portuguese (pt-BR).
- **suggestedDescription:** 2-3 persuasive sentences in Portuguese (pt-BR). Highlight fabric feel, versatility, and the piece's unique appeal. Use terms like "curadoria", "peça atemporal", or "impecável".

### FINAL INSTRUCTION:
- Analyze ALL provided images (front, back, tags) before deciding.
- Strictly use the enum values provided in the responseSchema.
- For array fields, include ALL applicable values to maximize metadata richness.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    suggestedTitle: { type: Type.STRING },
    suggestedDescription: { type: Type.STRING },
    color: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING, enum: enumValues(Color) },
        secondary: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: enumValues(Color) },
        },
        pattern: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: enumValues(Pattern) },
        },
        is_multicolor: { type: Type.BOOLEAN },
      },
      required: ["primary", "secondary", "pattern", "is_multicolor"],
    },
    categories: {
      type: Type.OBJECT,
      properties: {
        department: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: enumValues(Department) },
        },
        main: { type: Type.STRING, enum: enumValues(MainCategory) },
        sub: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: enumValues(SubCategory) },
        },
      },
      required: ["department", "main", "sub"],
    },
    shape: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(Shape) },
    },
    fit: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(Fit) },
    },
    condition: { type: Type.STRING, enum: enumValues(Condition) },
    sleeve: {
      type: Type.OBJECT,
      properties: {
        length: { type: Type.STRING, enum: enumValues(SleeveLength) },
        type: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: enumValues(SleeveType) },
        },
        construction: {
          type: Type.STRING,
          enum: enumValues(SleeveConstruction),
        },
      },
      required: ["length", "type", "construction"],
    },
    aesthetics: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(Aesthetic) },
    },
    occasion: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(Occasion) },
    },
    length: { type: Type.STRING, enum: enumValues(Length) },
    neckline: { type: Type.STRING, enum: enumValues(Neckline) },
    backDetails: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(BackDetail) },
    },
    finish: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(Finish) },
    },
    closure: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: enumValues(Closure) },
    },
    composition: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fiber: { type: Type.STRING, enum: enumValues(FabricFiber) },
          percentage: { type: Type.NUMBER },
        },
        required: ["fiber", "percentage"],
      },
    },
    pockets: {
      type: Type.OBJECT,
      properties: {
        has_pockets: { type: Type.BOOLEAN },
        quantity: { type: Type.NUMBER },
        types: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: enumValues(PocketType) },
        },
      },
      required: ["has_pockets", "quantity", "types"],
    },
  },
  required: [
    "suggestedTitle",
    "suggestedDescription",
    "color",
    "categories",
    "condition",
    "aesthetics",
    "occasion",
    "finish",
    "composition",
    // Removidos do required global: sleeve, pockets, neckline, backDetails, shape, fit
  ],
};

function buildPrompt(userDescription?: string): string {
  if (!userDescription?.trim()) return BASE_PROMPT;

  return `${BASE_PROMPT}

ADDITIONAL USER INFORMATION:
The user described the garment as: "${userDescription.trim()}"
Take this description into account along with the images to correctly classify the garment.`;
}

export interface AnalyzeResult {
  analysis: GarmentClassification;
  usage: AnalysisUsage;
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

  const analysis: GarmentClassification = JSON.parse(text);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = buildUsage(response.usageMetadata as any);

  return { analysis, usage };
}
