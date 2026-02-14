// --- CONSTANTES DE CATEGORIZAÇÃO ---
export const Department = {
  WOMEN: "women",
  MEN: "men",
  UNISEX: "unisex",
  KIDS: "kids",
} as const;
export type Department = (typeof Department)[keyof typeof Department];

export const MainCategory = {
  CLOTHING: "clothing",
  SHOES: "shoes",
  ACCESSORIES: "accessories",
  JEWELRY: "jewelry",
  BAGS: "bags",
} as const;
export type MainCategory = (typeof MainCategory)[keyof typeof MainCategory];

export const SubCategory = {
  TOPS: "tops",
  SHIRTS: "shirts",
  BOTTOMS: "bottoms",
  DRESSES: "dresses",
  PARTY_DRESSES: "party_dresses",
  BRIDAL: "bridal",
  SKIRTS: "skirts",
  SHORTS: "shorts",
  OUTERWEAR: "outerwear",
  KNITWEAR: "knitwear",
  ACTIVEWEAR: "activewear",
  LINGERIE: "lingerie",
  BEACHWEAR: "beachwear",
  TAILORING: "tailoring",
  JUMPSUITS: "jumpsuits",
  VESTS: "vests",
  SETS: "sets",
  RECYCLING: "recycling",
} as const;
export type SubCategory = (typeof SubCategory)[keyof typeof SubCategory];

// --- CONSTANTES DE MODELAGEM E FIT ---
export const Shape = {
  A_LINE: "a-line",
  SHEATH: "sheath",
  MERMAID: "mermaid",
  WRAP: "wrap",
  EMPIRE: "empire",
  SHIRT_DRESS: "shirt-dress",
  STRAIGHT: "straight",
  FLARE: "flare",
  CIRCLE: "circle",
  ASYMMETRIC: "asymmetric",
  BALLOON: "balloon",
  BOXV: "box",
  TRAPEZE: "trapeze",
  OTHER: "other",
} as const;
export type Shape = (typeof Shape)[keyof typeof Shape];

export const Fit = {
  SLIM: "slim",
  REGULAR: "regular",
  RELAXED: "relaxed",
  OVERSIZED: "oversized",
  CROPPED: "cropped",
  ELONGATED: "elongated",
  COMPRESSION: "compression",
  BODYCON: "bodycon",
} as const;
export type Fit = (typeof Fit)[keyof typeof Fit];

// --- CONSTANTES TÉCNICAS (MANGA, DECOTE, FECHAMENTO) ---
export const SleeveLength = {
  SHORT: "short",
  LONG: "long",
  THREE_QUARTER: "3/4",
  SLEEVELESS: "sleeveless",
  STRAPLESS: "strapless",
} as const;
export type SleeveLength = (typeof SleeveLength)[keyof typeof SleeveLength];

export const SleeveType = {
  CLASSIC: "classic",
  PUFF: "puff",
  BELL: "bell",
  BISHOP: "bishop",
  BATWING: "batwing",
  BUTTERFLY: "butterfly",
  CAP: "cap",
  BALOON: "baloon",
  FLARE: "flare",
  SPLIT: "split",
  TULIP: "tulip",
  OTHER: "other",
} as const;
export type SleeveType = (typeof SleeveType)[keyof typeof SleeveType];

export const SleeveConstruction = {
  SET_IN: "set-in",
  RAGLAN: "raglan",
  KIMONO: "kimono",
  DOLMAN: "dolman",
  DROPPED: "dropped",
} as const;
export type SleeveConstruction =
  (typeof SleeveConstruction)[keyof typeof SleeveConstruction];

export const Neckline = {
  V_NECK: "v-neck",
  U_NECK: "u-neck",
  ROUND_NECK: "round-neck",
  BOAT_NECK: "boat-neck",
  SQUARE_NECK: "square-neck",
  SWEETHEART: "sweetheart",
  HALTER: "halter",
  HIGH_NECK: "high-neck",
  OFF_SHOULDER: "off-shoulder",
  ONE_SHOULDER: "one-shoulder",
  COWL_NECK: "cowl-neck",
  STRAPLESS: "strapless",
} as const;
export type Neckline = (typeof Neckline)[keyof typeof Neckline];

export const Closure = {
  BUTTON: "button",
  ZIPPER: "zipper",
  DRAWSTRING: "drawstring",
  ELASTIC: "elastic",
  CLASP: "clasp",
  WRAP: "wrap",
  VELCRO: "velcro",
  NONE: "none",
  SNAP_BUTTON: "snap_button",
  HIDDEN_ZIPPER: "hidden_zipper",
} as const;
export type Closure = (typeof Closure)[keyof typeof Closure];

// --- CONSTANTES DE ESTÉTICA E ESTADO ---
export const Aesthetic = {
  VINTAGE: "vintage",
  MINIMALIST: "minimalist",
  BOHO: "boho",
  STREETWEAR: "streetwear",
  ROMANTIC: "romantic",
  CLASSIC: "classic",
  GRUNGE: "grunge",
  PREPPY: "preppy",
  GLAM: "glam",
  SPORTY: "sporty",
  RETRO: "retro",
  Y2K: "y2k",
  COTTAGECORE: "cottagecore",
  UTILITY: "utility",
} as const;
export type Aesthetic = (typeof Aesthetic)[keyof typeof Aesthetic];

export const Occasion = {
  CASUAL: "casual",
  WORK: "work",
  FORMAL: "formal",
  PARTY: "party",
  BEACHWEAR: "beachwear",
  ACTIVEWEAR: "activewear",
  LOUNGE: "lounge",
  NIGHT_OUT: "night_out",
  SPECIAL_EVENT: "special_event",
} as const;
export type Occasion = (typeof Occasion)[keyof typeof Occasion];

export const Condition = {
  NEW_WITH_TAGS: "new_with_tags",
  EXCELLENT: "excellent",
  VERY_GOOD: "very_good",
  GOOD: "good",
} as const;
export type Condition = (typeof Condition)[keyof typeof Condition];

export const BackDetail = {
  V_BACK: "v-back",
  U_BACK: "u-back",
  OPEN_BACK: "open-back",
  LOW_BACK: "low-back",
  RACERBACK: "racerback",
  KEYHOLE: "keyhole",
  LACE_UP: "lace-up",
  CLOSED: "closed",
  CROSSED_STRAPS: "crossed-straps",
} as const;
export type BackDetail = (typeof BackDetail)[keyof typeof BackDetail];

export const Finish = {
  TEXTURED: "textured",
  SMOOTH: "smooth",
  GLOSSY: "glossy",
  MATTE: "matte",
  METALLIC: "metallic",
  SHEER: "sheer",
  DISTRESSED: "distressed",
  RIBBED: "ribbed",
  PLEATED: "pleated",
  QUILTED: "quilted",
  COATED: "coated",
  EMBOSSED: "embossed",
  FUZZY: "fuzzy",
  CRINKLED: "crinkled",
} as const;
export type Finish = (typeof Finish)[keyof typeof Finish];

export const Length = {
  MINI: "mini",
  SHORT: "short",
  KNEE_LENGTH: "knee_length",
  MIDI: "midi",
  MAXI: "maxi",
  FLOOR_LENGTH: "floor_length",
  CROPPED: "cropped",
  STANDARD: "standard",
  SEVEN_EIGHTHS: "7_8_length",
} as const;
export type Length = (typeof Length)[keyof typeof Length];

export const PocketType = {
  FRONT: "front_pockets",
  BACK: "back_pockets",
  SIDE: "side_pockets",
  CARGO: "cargo_pockets",
  CHEST: "chest_pockets",
  INTERNAL: "internal_pockets",
  NONE: "none",
} as const;
export type PocketType = (typeof PocketType)[keyof typeof PocketType];

export const Color = {
  BLACK: "black",
  WHITE: "white",
  GREY: "grey",
  BEIGE: "beige",
  BROWN: "brown",
  BLUE: "blue",
  LIGHT_BLUE: "light_blue",
  NAVY_BLUE: "navy_blue",
  RED: "red",
  BURGUNDY: "burgundy",
  PINK: "pink",
  ROSE: "rose",
  GREEN: "green",
  OLIVE: "olive",
  YELLOW: "yellow",
  ORANGE: "orange",
  PURPLE: "purple",
  GOLD: "gold",
  SILVER: "silver",
  MULTI: "multi",
} as const;
export type Color = (typeof Color)[keyof typeof Color];

export const Pattern = {
  SOLID: "solid",
  STRIPED: "striped",
  CHECKERED: "checkered",
  FLORAL: "floral",
  ANIMAL_PRINT: "animal_print",
  POLKA_DOT: "polka_dot",
  GEOMETRIC: "geometric",
  ABSTRACT: "abstract",
  TIE_DYE: "tie_dye",
  PAISLEY: "paisley",
  HERRINGBONE: "herringbone",
  ACID_WASH: "acid_wash",
} as const;
export type Pattern = (typeof Pattern)[keyof typeof Pattern];

// --- COMPOSIÇÃO DO TECIDO ---
export const FabricFiber = {
  // Naturais (Vegetais/Animais)
  COTTON: "cotton",
  LINEN: "linen",
  SILK: "silk",
  WOOL: "wool",
  CASHMERE: "cashmere",
  HEMP: "hemp",

  // Sintéticas/Artificiais
  POLYESTER: "polyester",
  VISCOSE: "viscose",
  ELASTANE: "elastane", // Lycra
  POLYAMIDE: "polyamide", // Nylon
  ACRYLIC: "acrylic",
  ACETATE: "acetate",
  RAYON: "rayon",
  LYOCELL: "lyocell", // Tencel

  // Couro e Especiais
  LEATHER: "leather",
  SUEDE: "suede",
  FUR: "fur",
  FAUX_LEATHER: "faux_leather",
  DENIM: "denim",

  UNKNOWN: "unknown",
} as const;
export type FabricFiber = (typeof FabricFiber)[keyof typeof FabricFiber];

export interface FabricComposition {
  fiber: FabricFiber;
  percentage: number; // 0 a 100
}

// --- INTERFACE FINAL ---
export interface GarmentClassification {
  suggestedTitle: string;
  suggestedDescription: string;
  brand?: string;

  color: {
    primary: Color;
    secondary: Color[];
    pattern: Pattern[];
    is_multicolor: boolean;
  };

  categories: {
    department: Department[];
    main: MainCategory;
    sub: SubCategory[];
  };

  shape?: Shape[];
  fit?: Fit[];
  condition: Condition;

  sleeve?: {
    length: SleeveLength;
    type: SleeveType[];
    construction: SleeveConstruction;
  };

  aesthetics: Aesthetic[];
  occasion: Occasion[];

  length: Length;
  neckline?: Neckline;
  backDetails?: BackDetail[];
  finish: Finish[];
  closure: Closure[];
  composition: FabricComposition[];

  pockets: {
    has_pockets: boolean;
    quantity: number;
    types: PocketType[];
  };
  analysis_reasoning: string;
}

// --- TIPOS DE SUPORTE ---
export interface AnalysisUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  thoughtsTokenCount: number;
  estimatedCostUSD: number;
  estimatedCostBRL: number;
}

export interface AnalysisEntry extends GarmentClassification {
  id: string;
  imagePreviews: string[];
  analyzedAt: string;
  usage?: AnalysisUsage;
}

export interface PriceEstimateEntry {
  id: string;
  analysisId: string;
  category: string;
  marca: string;
  qualidade: string;
  suggestedTitle: string;
  precoMinimo: number;
  precoMaximo: number;
  precoSugerido: number;
  justificativa: string;
  estimatedAt: string;
  usage?: AnalysisUsage;
}
