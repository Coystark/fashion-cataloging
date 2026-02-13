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
} from "@/types/clothing";
import { ai, buildUsage } from "@/lib/gemini";

// Helper to extract enum values as string[]
function enumValues<T extends Record<string, string>>(e: T): string[] {
  return Object.values(e);
}

const BASE_PROMPT = `You are a fashion cataloging expert. Analyze the provided garment images (may include front, back, and fabric close-up photos) and return ONLY a JSON object following these rules:

suggestedTitle: Create a short, attractive title for the product listing (max 80 characters). It should be descriptive and include the category, main color, and a distinctive feature. Examples: "Black Midi Sheath Dress with Side Slit", "Blue Striped Long Sleeve Shirt", "Pink Floral A-Line Blouse with Ruffles".

suggestedDescription: Create a commercial product description (2-4 sentences). Highlight the material, fit, style details, and occasions. Use attractive, professional language.

color: Object with:
  - primary: The dominant color. One of: [${enumValues(Color).join(", ")}]
  - secondary: Array of other colors present. Values from: [${enumValues(
    Color
  ).join(", ")}]
  - pattern: Array of patterns detected. Values from: [${enumValues(
    Pattern
  ).join(", ")}]
  - is_multicolor: boolean, true if the garment has 3+ colors

categories: Object with:
  - department: Array of target departments. Values from: [${enumValues(
    Department
  ).join(", ")}]
  - main: The main category. One of: [${enumValues(MainCategory).join(", ")}]
  - sub: Array of applicable subcategories. Values from: [${enumValues(
    SubCategory
  ).join(", ")}]

shape: Array of applicable silhouettes. Values from: [${enumValues(Shape).join(
  ", "
)}]
fit: Array of applicable fits. Values from: [${enumValues(Fit).join(", ")}]
condition: The garment condition. One of: [${enumValues(Condition).join(", ")}]

sleeve: Object with:
  - length: One of: [${enumValues(SleeveLength).join(", ")}]
  - type: Array of sleeve types. Values from: [${enumValues(SleeveType).join(
    ", "
  )}]
  - construction: One of: [${enumValues(SleeveConstruction).join(", ")}]

aesthetics: Array of applicable aesthetics. Values from: [${enumValues(
  Aesthetic
).join(", ")}]
occasion: Array of suitable occasions. Values from: [${enumValues(
  Occasion
).join(", ")}]

length: The garment length. One of: [${enumValues(Length).join(", ")}]
neckline: The neckline type. One of: [${enumValues(Neckline).join(", ")}]
backDetails: Array of back details. Values from: [${enumValues(BackDetail).join(
  ", "
)}]
finish: Array of fabric finishes. Values from: [${enumValues(Finish).join(
  ", "
)}]
closure: Array of closure types. Values from: [${enumValues(Closure).join(
  ", "
)}]

pockets: Object with:
  - has_pockets: boolean
  - quantity: number of pockets visible
  - types: Array of pocket descriptions (free text)

IMPORTANT:
- Analyze ALL images together for a comprehensive and accurate classification.
- Use ONLY values from the provided lists for enum fields. Do not invent values.
- For array fields, include ALL applicable values, not just one.
- suggestedTitle and suggestedDescription are free text — be creative and commercial.
- Write suggestedTitle and suggestedDescription in Portuguese (pt-BR).

EXAMPLE OUTPUT:

{
  "suggestedTitle": "Vestido Midi Preto Tubinho com Fenda Elegante",
  "suggestedDescription": "Vestido tubinho preto em crepe de alta qualidade, perfeito para festas e eventos especiais. Modelo tomara que caia com fenda lateral que confere charme e sofisticação.",
  "color": {
    "primary": "black",
    "secondary": [],
    "pattern": ["solid"],
    "is_multicolor": false
  },
  "categories": {
    "department": ["women"],
    "main": "clothing",
    "sub": ["dresses"]
  },
  "shape": ["sheath"],
  "fit": ["bodycon"],
  "condition": "very_good",
  "sleeve": {
    "length": "strapless",
    "type": ["classic"],
    "construction": "set-in"
  },
  "aesthetics": ["classic", "glam"],
  "occasion": ["party", "formal"],
  "length": "midi",
  "neckline": "strapless",
  "backDetails": ["closed"],
  "finish": ["smooth"],
  "closure": ["hidden_zipper"],
  "pockets": {
    "has_pockets": false,
    "quantity": 0,
    "types": []
  }
}`;

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
    pockets: {
      type: Type.OBJECT,
      properties: {
        has_pockets: { type: Type.BOOLEAN },
        quantity: { type: Type.NUMBER },
        types: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
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
    "shape",
    "fit",
    "condition",
    "sleeve",
    "aesthetics",
    "occasion",
    "length",
    "neckline",
    "backDetails",
    "finish",
    "closure",
    "pockets",
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
