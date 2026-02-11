import * as React from "react";
import { analyzeClothingImage } from "@/lib/gemini";
import type { ClothingAnalysis } from "@/types/clothing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LABELS: Record<keyof ClothingAnalysis, string> = {
  categoria: "Categoria",
  corte_silhueta: "Corte / Silhueta",
  detalhes_estilo: "Detalhes de Estilo",
  estampa: "Estampa",
  material_visual: "Material Visual",
};

export function ImageAnalyzer() {
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageBase64, setImageBase64] = React.useState<string | null>(null);
  const [imageMimeType, setImageMimeType] =
    React.useState<string>("image/jpeg");
  const [result, setResult] = React.useState<ClothingAnalysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem.");
      return;
    }

    setError(null);
    setResult(null);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Remove o prefixo "data:image/xxx;base64," para enviar ao Gemini
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  React.useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  async function handleAnalyze() {
    if (!imageBase64) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeClothingImage(imageBase64, imageMimeType);
      setResult(analysis);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `Erro ao analisar imagem: ${err.message}`
          : "Erro desconhecido ao analisar imagem."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">
          Catalogação de Moda
        </h1>
        <p className="text-muted-foreground text-xs">
          Envie uma foto de uma peça de roupa e a IA irá catalogá-la
          automaticamente.
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />

          {!imagePreview ? (
            <label
              htmlFor="image-upload"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed p-8 transition-colors ${
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
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-medium">
                  Arraste uma imagem ou clique para selecionar
                </span>
                <span className="text-muted-foreground text-xs">
                  Você também pode colar uma imagem (Ctrl+V)
                </span>
              </div>
            </label>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative overflow-hidden border border-border">
                <img
                  src={imagePreview}
                  alt="Preview da imagem"
                  className="max-h-96 w-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAnalyze} disabled={loading}>
                  {loading ? "Analisando..." : "Analisar Imagem"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Remover Imagem
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-4">
              <div className="border-primary h-4 w-4 animate-spin border-2 border-t-transparent" />
              <span className="text-muted-foreground text-xs">
                Analisando imagem com Gemini...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent>
            <p className="text-destructive text-xs">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Análise</CardTitle>
            <CardDescription>
              Catalogação gerada automaticamente pela IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {(Object.keys(LABELS) as (keyof ClothingAnalysis)[]).map(
                (key) => {
                  const value = result[key];

                  if (key === "detalhes_estilo" && Array.isArray(value)) {
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                          {LABELS[key]}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {value.map((item) => (
                            <Badge key={item} variant="secondary">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        {LABELS[key]}
                      </span>
                      <span className="text-sm capitalize">
                        {value as string}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
