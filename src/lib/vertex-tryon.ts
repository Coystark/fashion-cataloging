/**
 * Vertex AI Virtual Try-On API
 *
 * Variáveis de ambiente necessárias no .env.local:
 *   VITE_GCP_PROJECT_ID  — ID do projeto no Google Cloud
 *   VITE_GCP_LOCATION    — Região (ex: us-central1)
 *   VITE_GCP_ACCESS_TOKEN — Token gerado via `gcloud auth print-access-token`
 *
 * O token expira em ~1h. Para uso em dev, regere com:
 *   gcloud auth print-access-token
 */

const GCP_PROJECT_ID = import.meta.env.VITE_GCP_PROJECT_ID as string;
const GCP_LOCATION = import.meta.env.VITE_GCP_LOCATION as string;
const GCP_ACCESS_TOKEN = import.meta.env.VITE_GCP_ACCESS_TOKEN as string;

const MODEL_ID = "virtual-try-on-preview-08-04";

/** Custo estimado por imagem gerada (USD) — ajuste conforme pricing real */
const TRYON_COST_PER_IMAGE_USD = 0.05;
const USD_TO_BRL = 5.8;

export interface TryOnResult {
  /** Data URL da imagem gerada (image/png) */
  imageDataUrl: string;
  /** Custo estimado em USD */
  estimatedCostUSD: number;
  /** Custo estimado em BRL */
  estimatedCostBRL: number;
  /** Tempo da requisição em milissegundos */
  elapsedMs: number;
}

/** Dimensão máxima (largura ou altura) para as imagens enviadas à API */
const MAX_IMAGE_DIMENSION = 1024;

/**
 * Carrega uma imagem (data-URL, caminho público ou SVG) num HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Falha ao carregar imagem: ${e}`));
    img.src = src;
  });
}

/**
 * Converte qualquer imagem (data-URL, caminho público, SVG) para base64 PNG,
 * redimensionando se necessário para respeitar o limite da API.
 * Retorna { base64, mimeType }.
 */
async function imageToBase64(
  src: string
): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImage(src);

  let { naturalWidth: w, naturalHeight: h } = img;

  // Se a imagem é SVG e o browser reporta 0×0, usar tamanho padrão
  if (w === 0 || h === 0) {
    w = MAX_IMAGE_DIMENSION;
    h = MAX_IMAGE_DIMENSION;
  }

  // Redimensionar mantendo proporção se exceder o limite
  if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar contexto 2D do canvas.");

  // Fundo branco (evita transparência que pode confundir a API)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);

  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];

  return { base64, mimeType: "image/png" };
}

/**
 * Chama a API Virtual Try-On da Vertex AI.
 *
 * @param productImageSrc — data-URL ou caminho da imagem do produto (peça de roupa)
 * @param personImageSrc — data-URL da imagem da pessoa/modelo fornecida pelo usuário
 */
export async function generateTryOn(
  productImageSrc: string,
  personImageSrc: string
): Promise<TryOnResult> {
  if (!GCP_PROJECT_ID || !GCP_LOCATION || !GCP_ACCESS_TOKEN) {
    throw new Error(
      "Configuração GCP ausente. Defina VITE_GCP_PROJECT_ID, VITE_GCP_LOCATION e VITE_GCP_ACCESS_TOKEN no .env.local"
    );
  }

  // Converter imagem do produto para base64
  const product = await imageToBase64(productImageSrc);

  // Converter imagem da pessoa (modelo fornecido pelo usuário) para base64
  const person = await imageToBase64(personImageSrc);

  const endpoint = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

  const body = {
    instances: [
      {
        personImage: {
          image: {
            bytesBase64Encoded: person.base64,
          },
        },
        productImages: [
          {
            image: {
              bytesBase64Encoded: product.base64,
            },
          },
        ],
      },
    ],
    parameters: {
      sampleCount: 1,
    },
  };

  const startTime = Date.now();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GCP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const elapsedMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro da API Vertex AI (${response.status}): ${errorText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await response.json();

  // A resposta contém predictions[].bytesBase64Encoded
  const predictions = data.predictions;
  if (!predictions || predictions.length === 0) {
    throw new Error("A API não retornou nenhuma imagem.");
  }

  const base64Image = predictions[0].bytesBase64Encoded;
  if (!base64Image) {
    throw new Error("A API não retornou dados de imagem válidos.");
  }

  const imageDataUrl = `data:image/png;base64,${base64Image}`;
  const estimatedCostUSD = TRYON_COST_PER_IMAGE_USD;
  const estimatedCostBRL = estimatedCostUSD * USD_TO_BRL;

  return { imageDataUrl, estimatedCostUSD, estimatedCostBRL, elapsedMs };
}
