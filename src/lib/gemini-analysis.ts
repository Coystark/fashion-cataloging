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

### 1. ANALYSIS REASONING (CHAIN-OF-THOUGHT)
- You MUST provide a 1-2 sentence technical justification in the 'analysis_reasoning' field.
- Explain visual cues for your decisions (e.g., "The curved bust line confirms a sweetheart neckline. The asymmetric high-low hem defines the shape, while the visible fabric grain suggests a viscose blend.").
- This step is critical to ensure classification accuracy before populating other fields.
- **LANGUAGE RULE:** This field MUST be written in Portuguese (pt-BR).

### 2. CONDITIONAL FIELD RULES (CRITICAL)
- **Top-Half Items (Dresses, Shirts, Jackets):** All fields are relevant.
- **Bottom-Half Items (Pants, Skirts, Shorts):** You MUST OMIT the 'sleeve', 'neckline', and 'backDetails' keys from the JSON.
- **Accessories & Shoes:** OMIT 'sleeve', 'neckline', 'backDetails', 'shape', and 'fit'. Focus on 'color', 'finish', 'composition', and 'aesthetics'.
- **Hybrid Items (e.g., Skorts/Short-Saia):** Use 'shorts' as subcategory and include 'wrap' or 'asymmetric' in the 'shape' array.

### 3. STYLE & TECHNICAL GUIDELINES
- **Aesthetic Mapping:** Be comprehensive. A single item can be 'classic', 'vintage', and 'minimalist' simultaneously.
- **Sleeve Construction:** Use 'dropped' for seams below the natural shoulder line; 'raglan' for diagonal seams from neck to armpit.
- **Neckline:** Use 'sweetheart' for heart-shaped, curved bust lines, even if the garment is strapless.
- **Shape Distinction:** Use 'a-line' for slight flares, 'circle' for high-volume circular drapes (Godê), and 'asymmetric' for uneven hems.

### 4. COMPOSITION & CONDITION
- **Label Priority:** If a fabric label is visible, extract exact percentages.
- **Visual Estimation:** If missing, estimate by texture: Shine/Fluidity -> 'polyester' or 'viscose'; Matte/Structured -> 'cotton' or 'linen'.
- **Constraint:** The sum of percentages in 'composition' MUST always equal 100.
- **Condition:** 'excellent' (pristine), 'very_good' (minor wash wear, no flaws), 'good' (visible pilling/fading, no holes).

### 5. COPYWRITING (Output in pt-BR)
- **suggestedTitle:** Max 80 characters. Format: [Garment Type] + [Brand if visible] + [Main Feature] + [Color].
- **suggestedDescription:** 2-3 persuasive sentences in Portuguese (pt-BR). Highlight fabric feel and versatility. Use terms like "curadoria", "peça atemporal", or "impecável".

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
    analysis_reasoning: {
      type: Type.STRING,
      description:
        "Brief explanation of why the specific categories, shapes, and materials were chosen based on visual cues.",
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
    "analysis_reasoning",
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
