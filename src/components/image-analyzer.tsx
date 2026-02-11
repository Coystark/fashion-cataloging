import * as React from "react";
import { analyzeClothingImage } from "@/lib/gemini-analysis";
import { PriceEstimateModal } from "@/components/price-estimate-modal";
import type {
  ClothingAnalysis,
  AnalysisEntry,
  AnalysisUsage,
} from "@/types/clothing";
import {
  loadHistory,
  saveAnalysis,
  deleteAnalysis,
  clearHistory,
  resizeMultipleImages,
  loadPriceHistoryForItem,
  computeItemAverages,
} from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const MAX_IMAGES = 3;

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const fmtUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const LABELS: Record<keyof ClothingAnalysis, string> = {
  titulo_sugerido: "Título Sugerido",
  descricao_sugerida: "Descrição Sugerida",
  categoria: "Categoria",
  cor: "Cor",
  corte_silhueta: "Corte / Silhueta",
  detalhes_estilo: "Detalhes de Estilo",
  estampa: "Estampa",
  material: "Material",
  ocasiao: "Ocasião",
  comprimento: "Comprimento",
  genero: "Gênero",
  condicao: "Condição",
  marca: "Marca",
};

/* ------------------------------------------------------------------ */
/*  Tipo interno para imagens pendentes de análise                     */
/* ------------------------------------------------------------------ */

interface PendingImage {
  preview: string; // data-URL completa
  base64: string; // parte base64 (sem prefixo)
  mimeType: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers para extrair opções únicas do histórico                    */
/* ------------------------------------------------------------------ */

function uniqueValues(
  entries: AnalysisEntry[],
  key: "categoria" | "corte_silhueta"
): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    const v = e[key];
    if (v) set.add(v.toLowerCase());
  }
  return Array.from(set).sort();
}

function uniqueDetailsValues(entries: AnalysisEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    for (const d of e.detalhes_estilo) {
      if (d) set.add(d.toLowerCase());
    }
  }
  return Array.from(set).sort();
}

/* ------------------------------------------------------------------ */
/*  Mini-componente: média de preço no card                            */
/* ------------------------------------------------------------------ */

function CardPriceAverage({
  analysisId,
  refreshKey,
}: {
  analysisId: string;
  refreshKey: number;
}) {
  const avg = React.useMemo(() => {
    const items = loadPriceHistoryForItem(analysisId);
    return computeItemAverages(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, refreshKey]);

  if (!avg) return null;

  return (
    <div className="bg-muted/40 border border-border rounded-md px-2.5 py-2 grid grid-cols-3 gap-2 mt-1">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Média Mín.
        </span>
        <span className="text-[11px] font-semibold tabular-nums">
          {fmtBRL.format(avg.avgMinimo)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Média Sug.
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-primary">
          {fmtBRL.format(avg.avgSugerido)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Média Máx.
        </span>
        <span className="text-[11px] font-semibold tabular-nums">
          {fmtBRL.format(avg.avgMaximo)}
        </span>
      </div>
      <span className="col-span-3 text-[10px] text-muted-foreground">
        {avg.count} {avg.count === 1 ? "estimativa" : "estimativas"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ImageAnalyzer() {
  const [images, setImages] = React.useState<PendingImage[]>([]);
  const [result, setResult] = React.useState<ClothingAnalysis | null>(null);
  const [resultUsage, setResultUsage] = React.useState<AnalysisUsage | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [userDescription, setUserDescription] = React.useState("");

  // Histórico
  const [history, setHistory] = React.useState<AnalysisEntry[]>([]);

  // Filtros
  const [filterCategoria, setFilterCategoria] = React.useState("");
  const [filterCorte, setFilterCorte] = React.useState("");
  const [filterDetalhe, setFilterDetalhe] = React.useState("");

  // Modal de estimativa de preço
  const [priceModalOpen, setPriceModalOpen] = React.useState(false);
  const [priceModalEntry, setPriceModalEntry] =
    React.useState<AnalysisEntry | null>(null);
  const [priceRefreshKey, setPriceRefreshKey] = React.useState(0);

  function handlePriceModalChange(open: boolean) {
    setPriceModalOpen(open);
    if (!open) {
      // Força re-render das médias nos cards quando o modal fecha
      setPriceRefreshKey((k) => k + 1);
    }
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Carrega histórico ao montar
  React.useEffect(() => {
    setHistory(loadHistory());
  }, []);

  /* ---- upload helpers ---- */

  function addFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem.");
      return;
    }

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setImages((prev) => {
        if (prev.length >= MAX_IMAGES) return prev;
        return [...prev, { preview: dataUrl, base64, mimeType: file.type }];
      });
    };
    reader.readAsDataURL(file);
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      addFile(file);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) addFiles(files);
    // Reseta o input para permitir re-selecionar o mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) addFiles(files);
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
          if (file) addFile(file);
          break;
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  /* ---- análise ---- */

  async function handleAnalyze() {
    if (images.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setResultUsage(null);

    try {
      const { analysis, usage } = await analyzeClothingImage(
        images.map((img) => ({
          base64Data: img.base64,
          mimeType: img.mimeType,
        })),
        userDescription
      );
      setResult(analysis);
      setResultUsage(usage);

      // Cria thumbnails reduzidas e salva no histórico
      const thumbnails = await resizeMultipleImages(
        images.map((img) => img.preview)
      );
      const entry: AnalysisEntry = {
        ...analysis,
        id: crypto.randomUUID(),
        imagePreviews: thumbnails,
        analyzedAt: new Date().toISOString(),
        usage,
      };
      saveAnalysis(entry);
      setHistory(loadHistory());
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
    setImages([]);
    setResult(null);
    setResultUsage(null);
    setError(null);
    setUserDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDeleteEntry(id: string) {
    deleteAnalysis(id);
    setHistory(loadHistory());
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  /* ---- filtragem ---- */

  const filteredHistory = React.useMemo(() => {
    return history.filter((entry) => {
      if (filterCategoria && entry.categoria.toLowerCase() !== filterCategoria)
        return false;
      if (filterCorte && entry.corte_silhueta.toLowerCase() !== filterCorte)
        return false;
      if (
        filterDetalhe &&
        !entry.detalhes_estilo.some((d) => d.toLowerCase() === filterDetalhe)
      )
        return false;
      return true;
    });
  }, [history, filterCategoria, filterCorte, filterDetalhe]);

  const categoriaOptions = React.useMemo(
    () => uniqueValues(history, "categoria"),
    [history]
  );
  const corteOptions = React.useMemo(
    () => uniqueValues(history, "corte_silhueta"),
    [history]
  );
  const detalheOptions = React.useMemo(
    () => uniqueDetailsValues(history),
    [history]
  );

  const hasActiveFilters = filterCategoria || filterCorte || filterDetalhe;
  const canAddMore = images.length < MAX_IMAGES;

  /* ---- render ---- */

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">
          Catalogação de Moda
        </h1>
        <p className="text-muted-foreground text-xs">
          Envie até {MAX_IMAGES} fotos de uma peça e a IA irá catalogá-la
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
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />

          {images.length === 0 ? (
            /* Área de drop vazia */
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
                  Arraste imagens ou clique para selecionar
                </span>
                <span className="text-muted-foreground text-xs">
                  Até {MAX_IMAGES} fotos — Você também pode colar (Ctrl+V)
                </span>
              </div>
            </label>
          ) : (
            /* Preview das imagens selecionadas */
            <div className="flex flex-col gap-4">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(
                    images.length + (canAddMore ? 1 : 0),
                    MAX_IMAGES
                  )}, minmax(0, 1fr))`,
                }}
              >
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="bg-muted relative overflow-hidden border border-border"
                  >
                    <img
                      src={img.preview}
                      alt={`Foto ${idx + 1}`}
                      className="h-48 w-full object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeImage(idx)}
                      className="absolute right-1.5 top-1.5 bg-background/80 backdrop-blur-sm cursor-pointer hover:bg-background"
                      title="Remover foto"
                    >
                      <HugeiconsIcon
                        icon={Delete01Icon}
                        className="h-3.5 w-3.5"
                      />
                    </Button>
                  </div>
                ))}

                {/* Slot para adicionar mais fotos */}
                {canAddMore && (
                  <label
                    htmlFor="image-upload"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span className="text-muted-foreground text-[10px] font-medium">
                      Adicionar
                    </span>
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="user-description"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Descrição da peça{" "}
                  <span className="text-muted-foreground/60">(opcional)</span>
                </label>
                <input
                  id="user-description"
                  type="text"
                  placeholder='Ex: "body feminino", "saia midi", "blazer masculino"'
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-muted-foreground/60 text-[10px]">
                  Ajuda a IA a classificar melhor a peça combinando sua
                  descrição com as imagens.
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAnalyze} disabled={loading}>
                  {loading
                    ? "Analisando..."
                    : `Analisar ${
                        images.length === 1
                          ? "Imagem"
                          : `${images.length} Imagens`
                      }`}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Remover Tudo
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
                Analisando{" "}
                {images.length === 1 ? "imagem" : `${images.length} imagens`}{" "}
                ...
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
              {/* Título e Descrição sugeridos — destaque */}
              {result.titulo_sugerido && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Título Sugerido
                  </span>
                  <span className="text-sm font-semibold">
                    {result.titulo_sugerido}
                  </span>
                </div>
              )}
              {result.descricao_sugerida && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Descrição Sugerida
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {result.descricao_sugerida}
                  </p>
                </div>
              )}

              {(result.titulo_sugerido || result.descricao_sugerida) && (
                <div className="border-border border-t" />
              )}

              {(
                Object.keys(LABELS).filter(
                  (k) => k !== "titulo_sugerido" && k !== "descricao_sugerida"
                ) as (keyof ClothingAnalysis)[]
              ).map((key) => {
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
                    <span className="text-sm capitalize">{value || "-"}</span>
                  </div>
                );
              })}

              {/* Uso de tokens e custo estimado */}
              {resultUsage && (
                <div className="border-border mt-2 border-t pt-3">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Consumo da análise
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">
                        Tokens entrada
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {resultUsage.promptTokenCount.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">
                        Tokens saída
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {resultUsage.candidatesTokenCount.toLocaleString(
                          "pt-BR"
                        )}
                      </span>
                    </div>
                    {resultUsage.thoughtsTokenCount > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px]">
                          Tokens thinking
                        </span>
                        <span className="text-xs font-medium tabular-nums">
                          {resultUsage.thoughtsTokenCount.toLocaleString(
                            "pt-BR"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">
                        Total tokens
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {resultUsage.totalTokenCount.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">
                        Custo estimado
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {fmtBRL.format(resultUsage.estimatedCostBRL)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">
                        Custo USD
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {fmtUSD.format(resultUsage.estimatedCostUSD)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Histórico de Análises                                        */}
      {/* ------------------------------------------------------------ */}

      {history.length > 0 && (
        <>
          <div className="border-border border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold tracking-tight">
                  Histórico de Análises
                </h2>
                <p className="text-muted-foreground text-xs">
                  {history.length}{" "}
                  {history.length === 1 ? "análise salva" : "análises salvas"}
                  {hasActiveFilters && ` · ${filteredHistory.length} exibidas`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearHistory}>
                Limpar Histórico
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Categoria */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filter-categoria"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Categoria
                  </label>
                  <select
                    id="filter-categoria"
                    value={filterCategoria}
                    onChange={(e) => setFilterCategoria(e.target.value)}
                    className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">Todas</option>
                    {categoriaOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Corte / Silhueta */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filter-corte"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Corte / Silhueta
                  </label>
                  <select
                    id="filter-corte"
                    value={filterCorte}
                    onChange={(e) => setFilterCorte(e.target.value)}
                    className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">Todos</option>
                    {corteOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detalhes de Estilo */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filter-detalhe"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Detalhes de Estilo
                  </label>
                  <select
                    id="filter-detalhe"
                    value={filterDetalhe}
                    onChange={(e) => setFilterDetalhe(e.target.value)}
                    className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">Todos</option>
                    {detalheOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterCategoria("");
                      setFilterCorte("");
                      setFilterDetalhe("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grid de cards */}
          {filteredHistory.length === 0 ? (
            <p className="text-muted-foreground text-center text-xs py-8">
              Nenhuma análise corresponde aos filtros selecionados.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHistory.map((entry) => (
                <Card key={entry.id} className="group relative overflow-hidden">
                  {/* Imagens — carousel se houver mais de 1 */}
                  <div className="bg-muted relative">
                    {entry.imagePreviews.length > 1 ? (
                      <Carousel className="w-full">
                        <CarouselContent className="ml-0">
                          {entry.imagePreviews.map((src, idx) => (
                            <CarouselItem key={idx} className="pl-0">
                              <div className="flex items-center justify-center">
                                <img
                                  src={src}
                                  alt={`Foto ${idx + 1}`}
                                  className="h-40 w-full object-contain"
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-1.5 h-6 w-6" />
                        <CarouselNext className="right-1.5 h-6 w-6" />
                      </Carousel>
                    ) : (
                      <img
                        src={entry.imagePreviews[0]}
                        alt="Thumbnail"
                        className="h-40 w-full object-contain"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                      title="Remover análise"
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="flex flex-col gap-2 pt-3">
                    {/* Título sugerido */}
                    {entry.titulo_sugerido && (
                      <span className="text-sm font-semibold leading-snug">
                        {entry.titulo_sugerido}
                      </span>
                    )}

                    {/* Categoria */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                        Categoria
                      </span>
                      <span className="text-xs capitalize">
                        {entry.categoria}
                      </span>
                    </div>
                    {entry.descricao_sugerida && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Descrição
                        </span>
                        <p className="text-xs leading-relaxed text-foreground/80 line-clamp-3">
                          {entry.descricao_sugerida}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Cor
                        </span>
                        <span className="text-xs capitalize">{entry.cor}</span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Corte / Silhueta
                        </span>
                        <span className="text-xs capitalize">
                          {entry.corte_silhueta}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Estampa
                        </span>
                        <span className="text-xs capitalize">
                          {entry.estampa}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Material
                        </span>
                        <span className="text-xs capitalize">
                          {entry.material || "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Ocasião
                        </span>
                        <span className="text-xs capitalize">
                          {entry.ocasiao || "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Comprimento
                        </span>
                        <span className="text-xs capitalize">
                          {entry.comprimento || "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Gênero
                        </span>
                        <span className="text-xs capitalize">
                          {entry.genero || "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Condição
                        </span>
                        <span className="text-xs capitalize">
                          {entry.condicao || "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Marca
                        </span>
                        <span className="text-xs capitalize">
                          {entry.marca || "—"}
                        </span>
                      </div>
                    </div>

                    {entry.detalhes_estilo.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {entry.detalhes_estilo.map((d) => (
                          <Badge
                            key={d}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {d}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <CardPriceAverage
                      analysisId={entry.id}
                      refreshKey={priceRefreshKey}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-1 cursor-pointer"
                      onClick={() => {
                        setPriceModalEntry(entry);
                        setPriceModalOpen(true);
                      }}
                    >
                      Analisar Preço
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de estimativa de preço */}
      <PriceEstimateModal
        entry={priceModalEntry}
        open={priceModalOpen}
        onOpenChange={handlePriceModalChange}
      />
    </div>
  );
}
