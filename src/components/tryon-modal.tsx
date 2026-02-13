import * as React from "react";
import type { AnalysisEntry } from "@/types/clothing";
import { generateTryOn } from "@/lib/vertex-tryon";
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

interface TryOnModalProps {
  entry: AnalysisEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TryOnModal({ entry, open, onOpenChange }: TryOnModalProps) {
  const [personImage, setPersonImage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultImage, setResultImage] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reseta estado quando modal fecha
  React.useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setResultImage(null);
      setPersonImage(null);
    }
  }, [open]);

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
    // Reset para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  }

  async function handleGenerate() {
    if (!entry || entry.imagePreviews.length === 0 || !personImage) return;

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      // Usa a primeira imagem da análise como produto
      const productImage = entry.imagePreviews[0];
      const { imageDataUrl } = await generateTryOn(productImage, personImage);
      setResultImage(imageDataUrl);
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

  const canGenerate =
    !!personImage && !!entry && entry.imagePreviews.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg sm:max-w-lg max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Virtual Try-On</AlertDialogTitle>
          <AlertDialogDescription>
            {entry
              ? `Envie uma foto de modelo para visualizar "${entry.suggestedTitle}" vestida.`
              : "Envie uma foto de modelo para visualizar a peça vestida."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          {/* Preview da imagem do produto */}
          {entry && entry.imagePreviews.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Imagem do Produto
              </span>
              <div className="bg-muted border border-border rounded-md overflow-hidden">
                <img
                  src={entry.imagePreviews[0]}
                  alt="Produto"
                  className="h-40 w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Upload da imagem do modelo */}
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Imagem do Modelo (pessoa)
            </span>

            {personImage ? (
              <div className="relative group">
                <div className="bg-muted border border-border rounded-md overflow-hidden">
                  <img
                    src={personImage}
                    alt="Modelo"
                    className="h-48 w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPersonImage(null);
                    setResultImage(null);
                  }}
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
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
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
                  Arraste uma foto ou clique para selecionar
                </span>
                <span className="text-muted-foreground/60 text-[10px]">
                  Use uma foto de corpo inteiro para melhores resultados
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-4">
              <div className="border-primary h-4 w-4 animate-spin border-2 border-t-transparent rounded-full" />
              <span className="text-muted-foreground text-xs">
                Gerando imagem de Try-On... Isso pode levar alguns segundos.
              </span>
            </div>
          )}

          {/* Erro */}
          {error && <p className="text-destructive text-xs">{error}</p>}

          {/* Resultado */}
          {resultImage && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Resultado
              </span>
              <div className="bg-muted border border-border rounded-md overflow-hidden">
                <img
                  src={resultImage}
                  alt="Try-On resultado"
                  className="w-full object-contain max-h-96"
                />
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Fechar</AlertDialogCancel>
          {!resultImage && (
            <Button onClick={handleGenerate} disabled={loading || !canGenerate}>
              {loading ? "Gerando..." : "Gerar"}
            </Button>
          )}
          {resultImage && (
            <Button
              onClick={() => {
                setResultImage(null);
                setError(null);
              }}
              variant="outline"
            >
              Gerar Novamente
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
