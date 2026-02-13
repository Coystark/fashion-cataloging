// ---------------------------------------------------------------------------
// Traduções EN → PT-BR para todos os enums retornados pelo Gemini.
// Os valores internos continuam em inglês; estas constantes são usadas
// apenas na camada de apresentação (componentes).
// ---------------------------------------------------------------------------

import type {
  Aesthetic,
  BackDetail,
  Closure,
  Color,
  Condition,
  Department,
  FabricFiber,
  Finish,
  Fit,
  Length,
  MainCategory,
  Neckline,
  Occasion,
  Pattern,
  PocketType,
  Shape,
  SleeveConstruction,
  SleeveLength,
  SleeveType,
  SubCategory,
} from "@/types/clothing";

/** Traduz um valor usando o mapa fornecido. Retorna o valor original se não houver tradução. */
export function t(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

/** Traduz uma lista de valores usando o mapa fornecido. */
export function tList(map: Record<string, string>, values: string[]): string[] {
  return values.map((v) => t(map, v));
}

// --- Departamento ---
export const DepartmentLabels: Record<Department, string> = {
  women: "Feminino",
  men: "Masculino",
  unisex: "Unissex",
  kids: "Infantil",
};

// --- Categoria Principal ---
export const MainCategoryLabels: Record<MainCategory, string> = {
  clothing: "Roupas",
  shoes: "Calçados",
  accessories: "Acessórios",
  jewelry: "Joias",
  bags: "Bolsas",
};

// --- Subcategoria ---
export const SubCategoryLabels: Record<SubCategory, string> = {
  tops: "Blusas, Camisetas e Polos",
  shirts: "Camisas",
  bottoms: "Calças",
  dresses: "Vestidos",
  party_dresses: "Vestidos de Festa",
  bridal: "Vestidos de Noiva",
  skirts: "Saias",
  shorts: "Shorts e Bermudas",
  outerwear: "Jaquetas e Casacos",
  knitwear: "Malhas e Suéteres",
  activewear: "Moda Fitness",
  lingerie: "Lingerie e Pijamas",
  beachwear: "Praia",
  tailoring: "Ternos, Blazers e Blazers Masculinos",
  jumpsuits: "Macacão",
  vests: "Coletes",
  sets: "Conjuntos",
  recycling: "Re-cycling",
};

// --- Silhueta ---
export const ShapeLabels: Record<Shape, string> = {
  "a-line": "Evasê",
  sheath: "Tubinho",
  mermaid: "Sereia",
  wrap: "Transpassado",
  empire: "Império",
  "shirt-dress": "Chemise",
  straight: "Reto",
  flare: "Abertura Ampla",
  circle: "Godê",
  asymmetric: "Assimétrico",
  balloon: "Balonê",
  box: "Quadrado",
  trapeze: "Trapézio",
  other: "Outro",
};

// --- Caimento ---
export const FitLabels: Record<Fit, string> = {
  slim: "Justo",
  regular: "Regular",
  relaxed: "Relaxado",
  oversized: "Oversized",
  cropped: "Cropped",
  elongated: "Alongado",
  compression: "Compressão",
  bodycon: "Bodycon",
};

// --- Comprimento da Manga ---
export const SleeveLengthLabels: Record<SleeveLength, string> = {
  short: "Curta",
  long: "Longa",
  "3/4": "Três quartos",
  sleeveless: "Sem manga",
  strapless: "Tomara que caia",
};

// --- Tipo de Manga ---
export const SleeveTypeLabels: Record<SleeveType, string> = {
  classic: "Clássica",
  puff: "Bufante",
  bell: "Sino",
  bishop: "Bispo",
  batwing: "Morcego",
  butterfly: "Borboleta",
  cap: "Copinha",
  baloon: "Balão",
  flare: "Flare",
  split: "Fenda",
  tulip: "Tulipa",
  other: "Outro",
};

// --- Construção da Manga ---
export const SleeveConstructionLabels: Record<SleeveConstruction, string> = {
  "set-in": "Set-in",
  raglan: "Raglan",
  kimono: "Kimono",
  dolman: "Dolman",
  dropped: "Ombro caído",
};

// --- Decote ---
export const NecklineLabels: Record<Neckline, string> = {
  "v-neck": "Decote V",
  "u-neck": "Decote U",
  "round-neck": "Gola redonda",
  "boat-neck": "Decote canoa",
  "square-neck": "Decote quadrado",
  sweetheart: "Coração",
  halter: "Frente única",
  "high-neck": "Gola alta",
  "off-shoulder": "Ombro a ombro",
  "one-shoulder": "Um ombro só",
  "cowl-neck": "Gola drapeada",
  strapless: "Tomara que caia",
};

// --- Fechamento ---
export const ClosureLabels: Record<Closure, string> = {
  button: "Botão",
  zipper: "Zíper",
  drawstring: "Cordão",
  elastic: "Elástico",
  clasp: "Fecho",
  wrap: "Transpassado",
  velcro: "Velcro",
  none: "Nenhum",
  snap_button: "Botão de pressão",
  hidden_zipper: "Zíper invisível",
};

// --- Estética ---
export const AestheticLabels: Record<Aesthetic, string> = {
  vintage: "Vintage",
  minimalist: "Minimalista",
  boho: "Boho",
  streetwear: "Streetwear",
  romantic: "Romântico",
  classic: "Clássico",
  grunge: "Grunge",
  preppy: "Preppy",
  glam: "Glam",
  sporty: "Esportivo",
  retro: "Retrô",
  y2k: "Y2K",
  cottagecore: "Cottagecore",
  utility: "Utilitário",
};

// --- Ocasião ---
export const OccasionLabels: Record<Occasion, string> = {
  casual: "Casual",
  work: "Trabalho",
  formal: "Formal",
  party: "Festa",
  beachwear: "Praia",
  activewear: "Esportivo",
  lounge: "Loungewear",
  night_out: "Noite",
  special_event: "Evento especial",
};

// --- Condição ---
export const ConditionLabels: Record<Condition, string> = {
  new_with_tags: "Novo com etiquetas",
  excellent: "Excelente",
  very_good: "Muito bom",
  good: "Bom",
};

// --- Detalhes das Costas ---
export const BackDetailLabels: Record<BackDetail, string> = {
  "v-back": "Costas em V",
  "u-back": "Costas em U",
  "open-back": "Costas abertas",
  "low-back": "Costas baixas",
  racerback: "Nadador",
  keyhole: "Abertura gota",
  "lace-up": "Amarração",
  closed: "Fechado",
  "crossed-straps": "Alças cruzadas",
};

// --- Acabamento ---
export const FinishLabels: Record<Finish, string> = {
  textured: "Texturizado",
  smooth: "Liso",
  glossy: "Brilhante",
  matte: "Fosco",
  metallic: "Metalizado",
  sheer: "Transparente",
  distressed: "Destroyed",
  ribbed: "Canelado",
  pleated: "Plissado",
  quilted: "Matelassê",
  coated: "Resinado",
  embossed: "Alto-relevo",
  fuzzy: "Pelúcia",
  crinkled: "Amassado",
};

// --- Comprimento ---
export const LengthLabels: Record<Length, string> = {
  mini: "Mini",
  short: "Curto",
  knee_length: "Na altura do joelho",
  midi: "Mídi",
  maxi: "Longo",
  floor_length: "Até o chão",
  cropped: "Cropped",
  standard: "Regular",
  "7_8_length": "7/8",
};

// --- Tipo de Bolso ---
export const PocketTypeLabels: Record<PocketType, string> = {
  front_pockets: "Bolsos frontais",
  back_pockets: "Bolsos traseiros",
  side_pockets: "Bolsos laterais",
  cargo_pockets: "Bolsos cargo",
  chest_pockets: "Bolsos no peito",
  internal_pockets: "Bolsos internos",
  none: "Nenhum",
};

// --- Cor ---
export const ColorLabels: Record<Color, string> = {
  black: "Preto",
  white: "Branco",
  grey: "Cinza",
  beige: "Bege",
  brown: "Marrom",
  blue: "Azul",
  light_blue: "Azul claro",
  navy_blue: "Azul marinho",
  red: "Vermelho",
  burgundy: "Bordô",
  pink: "Rosa",
  rose: "Rosê",
  green: "Verde",
  olive: "Verde oliva",
  yellow: "Amarelo",
  orange: "Laranja",
  purple: "Roxo",
  gold: "Dourado",
  silver: "Prateado",
  multi: "Multicolorido",
};

// --- Estampa ---
export const PatternLabels: Record<Pattern, string> = {
  solid: "Liso",
  striped: "Listrado",
  checkered: "Xadrez",
  floral: "Floral",
  animal_print: "Animal print",
  polka_dot: "Poá",
  geometric: "Geométrico",
  abstract: "Abstrato",
  tie_dye: "Tie-dye",
  paisley: "Paisley",
  herringbone: "Espinha de peixe",
  acid_wash: "Acid wash",
};

// --- Fibra do Tecido ---
export const FabricFiberLabels: Record<FabricFiber, string> = {
  // Naturais
  cotton: "Algodão",
  linen: "Linho",
  silk: "Seda",
  wool: "Lã",
  cashmere: "Cashmere",
  hemp: "Cânhamo",

  // Sintéticas / Artificiais
  polyester: "Poliéster",
  viscose: "Viscose",
  elastane: "Elastano",
  polyamide: "Poliamida",
  acrylic: "Acrílico",
  acetate: "Acetato",
  rayon: "Rayon",
  lyocell: "Lyocell",

  // Couro e Especiais
  leather: "Couro",
  suede: "Camurça",
  fur: "Pele",
  faux_leather: "Couro sintético",
  denim: "Jeans",

  unknown: "Desconhecido",
};
