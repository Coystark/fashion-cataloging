import * as React from "react";
import type { AnalysisEntry } from "@/types/clothing";
import { generateTryOn } from "@/lib/vertex-tryon";
import {
  loadTryOnHistoryForItem,
  saveTryOnEntry,
  deleteTryOnEntry,
  resizeImageDataUrl,
  type TryOnHistoryItem,
} from "@/lib/history";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

/* ------------------------------------------------------------------ */
/*  Modelos pré-carregados                                              */
/* ------------------------------------------------------------------ */

const PRELOADED_MODELS = [
  { label: "Modelo 1 — Frente", src: "/models/1_front.webp" },
  { label: "Modelo 1 — Costas", src: "/models/1_back.webp" },
  { label: "Modelo 2 — Frente", src: "/models/2_front.webp" },
  { label: "Modelo 2 — Costas", src: "/models/2_back.webp" },
  { label: "Modelo 3 — Frente", src: "/models/3_front.webp" },
  { label: "Modelo 3 — Costas", src: "/models/3_back.webp" },
  { label: "Modelo 4 — Frente", src: "/models/4_front.webp" },
  { label: "Modelo 4 — Costas", src: "/models/4_back.webp" },
];

/* ------------------------------------------------------------------ */
/*  Formatadores                                                        */
/* ------------------------------------------------------------------ */

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const fmtUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface TryOnModalProps {
  entry: AnalysisEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Componente                                                          */
/* ------------------------------------------------------------------ */

export function TryOnModal({ entry, open, onOpenChange }: TryOnModalProps) {
  const [personImage, setPersonImage] = React.useState<string | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<TryOnHistoryItem[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Carrega histórico persistido quando abre com uma entry
  React.useEffect(() => {
    if (open && entry) {
      setHistory(loadTryOnHistoryForItem(entry.id));
    }
  }, [open, entry]);

  // Reseta estado transitório quando modal fecha
  React.useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setPersonImage(null);
      setSelectedProductIndex(0);
    }
  }, [open]);

  /* ---- Helpers de upload ---- */

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPersonImage(dataUrl);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  /* ---- Geração ---- */

  async function handleGenerate() {
    if (!entry || entry.imagePreviews.length === 0 || !personImage) return;

    setLoading(true);
    setError(null);

    try {
      const productImage = entry.imagePreviews[selectedProductIndex];
      const { imageDataUrl, estimatedCostUSD, estimatedCostBRL, elapsedMs } =
        await generateTryOn(productImage, personImage);

      // Comprimir imagens para economizar espaço no localStorage
      const [compressedResult, compressedProduct, compressedPerson] =
        await Promise.all([
          resizeImageDataUrl(imageDataUrl, 1024, 0.9),
          resizeImageDataUrl(productImage, 150, 0.5),
          resizeImageDataUrl(personImage, 150, 0.5),
        ]);

      const newItem: TryOnHistoryItem = {
        id: crypto.randomUUID(),
        analysisId: entry.id,
        productImage: compressedProduct,
        personImage: compressedPerson,
        resultImage: compressedResult,
        estimatedCostUSD,
        estimatedCostBRL,
        elapsedMs,
        createdAt: new Date().toISOString(),
      };

      saveTryOnEntry(newItem);
      setHistory((prev) => [newItem, ...prev]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao gerar Try-On."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteHistoryItem(id: string) {
    deleteTryOnEntry(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }

  /* ---- Derivados ---- */

  const canGenerate =
    !!personImage && !!entry && entry.imagePreviews.length > 0;

  const totalCostUSD = history.reduce((s, h) => s + h.estimatedCostUSD, 0);
  const totalCostBRL = history.reduce((s, h) => s + h.estimatedCostBRL, 0);
  const latestResult = history.length > 0 ? history[0] : null;

  const isPreloadedModel = PRELOADED_MODELS.some((m) => m.src === personImage);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] flex flex-col max-w-lg! sm:max-w-xl!">
        <AlertDialogHeader>
          <AlertDialogTitle>Virtual Try-On</AlertDialogTitle>
          <AlertDialogDescription>
            {entry
              ? `Escolha a foto da peça e do modelo para visualizar "${entry.suggestedTitle}" vestida.`
              : "Envie uma foto de modelo para visualizar a peça vestida."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          {/* ---- Seletor de imagem do produto ---- */}
          {entry && entry.imagePreviews.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Imagem do Produto
                {entry.imagePreviews.length > 1 && (
                  <span className="text-muted-foreground/60 ml-1">
                    (clique para selecionar)
                  </span>
                )}
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {entry.imagePreviews.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedProductIndex(idx)}
                    className={`shrink-0 bg-muted border-2 rounded-md overflow-hidden transition-colors cursor-pointer ${
                      idx === selectedProductIndex
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Produto ${idx + 1}`}
                      className="h-36 w-28 object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---- Imagem do modelo (pessoa) ---- */}
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Imagem do Modelo (pessoa)
            </span>

            {/* Modelos pré-carregados */}
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground/60 text-[10px]">
                Selecione um modelo ou envie sua própria foto
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {PRELOADED_MODELS.map((model) => (
                  <button
                    key={model.src}
                    type="button"
                    onClick={() => {
                      // Toggle: clicou no mesmo → deseleciona
                      if (personImage === model.src) {
                        setPersonImage(null);
                      } else {
                        setPersonImage(model.src);
                        setError(null);
                      }
                    }}
                    disabled={loading}
                    className={`shrink-0 bg-muted border-2 rounded-md overflow-hidden transition-colors cursor-pointer ${
                      personImage === model.src
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    title={model.label}
                  >
                    <img
                      src={model.src}
                      alt={model.label}
                      className="h-32 w-24 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview da imagem selecionada (custom upload) */}
            {personImage && !isPreloadedModel ? (
              <div className="relative group">
                <div className="bg-muted border border-border rounded-md overflow-hidden">
                  <img
                    src={personImage}
                    alt="Modelo"
                    className="h-56 w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPersonImage(null)}
                  disabled={loading}
                  className="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remover imagem"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : !personImage ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-md p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-muted-foreground text-xs text-center">
                  Ou arraste / clique para enviar sua foto
                </span>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* ---- Loading ---- */}
          {loading && (
            <div className="flex items-center gap-3 py-4">
              <div className="border-primary h-5 w-5 animate-spin border-2 border-t-transparent rounded-full" />
              <span className="text-muted-foreground text-sm">
                Gerando imagem de Try-On... Isso pode levar alguns segundos.
              </span>
            </div>
          )}

          {/* ---- Erro ---- */}
          {error && <p className="text-destructive text-xs">{error}</p>}

          {/* ---- Resultado mais recente ---- */}
          {latestResult && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Resultado
              </span>
              <div className="bg-muted border border-border rounded-md overflow-hidden">
                <Zoom>
                  <img
                    src={latestResult.resultImage}
                    alt="Try-On resultado"
                    className="w-full object-contain max-h-112"
                  />
                </Zoom>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>
                  Custo: {fmtUSD.format(latestResult.estimatedCostUSD)} /{" "}
                  {fmtBRL.format(latestResult.estimatedCostBRL)}
                </span>
                <span>
                  Tempo: {(latestResult.elapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          )}

          {/* ---- Histórico de resultados ---- */}
          {history.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Histórico ({history.length} gerações)
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="shrink-0 flex flex-col items-center gap-0.5 relative group"
                  >
                    <div className="bg-muted border border-border rounded-md overflow-hidden">
                      <Zoom>
                        <img
                          src={item.resultImage}
                          alt="Resultado"
                          className="h-36 w-28 object-cover"
                        />
                      </Zoom>
                    </div>
                    <span className="text-[9px] text-muted-foreground/60">
                      {fmtUSD.format(item.estimatedCostUSD)} &middot;{" "}
                      {(item.elapsedMs / 1000).toFixed(1)}s
                    </span>
                    {/* Botão de excluir */}
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      className="absolute -top-1 -right-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-full p-0.5 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remover do histórico"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {/* Custo acumulado */}
              <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                Total acumulado: {fmtUSD.format(totalCostUSD)} /{" "}
                {fmtBRL.format(totalCostBRL)} &middot; {history.length}{" "}
                {history.length === 1 ? "geração" : "gerações"}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Fechar</AlertDialogCancel>
          <Button onClick={handleGenerate} disabled={loading || !canGenerate}>
            {loading
              ? "Gerando..."
              : history.length > 0
              ? "Gerar Novamente"
              : "Gerar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
