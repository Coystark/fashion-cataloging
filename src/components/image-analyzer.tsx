import * as React from "react";
import { analyzeClothingImage } from "@/lib/gemini-analysis";
import { PriceEstimateModal } from "@/components/price-estimate-modal";
import { TryOnModal } from "@/components/tryon-modal";
import type {
  GarmentClassification,
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
import {
  t,
  tList,
  MainCategoryLabels,
  DepartmentLabels,
  SubCategoryLabels,
  ColorLabels,
  PatternLabels,
  ShapeLabels,
  FitLabels,
  LengthLabels,
  ConditionLabels,
  SleeveLengthLabels,
  SleeveTypeLabels,
  SleeveConstructionLabels,
  NecklineLabels,
  BackDetailLabels,
  FinishLabels,
  ClosureLabels,
  FabricFiberLabels,
  PocketTypeLabels,
  AestheticLabels,
  OccasionLabels,
} from "@/constants/translations";

const MAX_IMAGES = 3;

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const fmtUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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

function uniqueMainCategories(entries: AnalysisEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.categories?.main) set.add(e.categories.main.toLowerCase());
  }
  return Array.from(set).sort();
}

function uniqueShapes(entries: AnalysisEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    for (const s of e.shape ?? []) {
      if (s) set.add(s.toLowerCase());
    }
  }
  return Array.from(set).sort();
}

function uniqueAesthetics(entries: AnalysisEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    for (const a of e.aesthetics ?? []) {
      if (a) set.add(a.toLowerCase());
    }
  }
  return Array.from(set).sort();
}

/* ------------------------------------------------------------------ */
/*  Helper: renderiza valor(es) como badges                            */
/* ------------------------------------------------------------------ */

function BadgeList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <span className="text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="text-[10px]">
          {item}
        </Badge>
      ))}
    </div>
  );
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
/*  Helper: renderiza um campo de resultado da análise                  */
/* ------------------------------------------------------------------ */

function ResultField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {label}
      </span>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Componente para exibir resultado completo da análise                */
/* ------------------------------------------------------------------ */

function AnalysisResultDisplay({ result }: { result: GarmentClassification }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Título e Descrição sugeridos — destaque */}
      {result.suggestedTitle && (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Título Sugerido
          </span>
          <span className="text-sm font-semibold">{result.suggestedTitle}</span>
        </div>
      )}
      {result.suggestedDescription && (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Descrição Sugerida
          </span>
          <p className="text-sm leading-relaxed text-foreground/90">
            {result.suggestedDescription}
          </p>
        </div>
      )}

      {(result.suggestedTitle || result.suggestedDescription) && (
        <div className="border-border border-t" />
      )}

      {/* Categorias */}
      <ResultField
        label="Categoria Principal"
        value={t(MainCategoryLabels, result.categories.main)}
      />
      <ResultField
        label="Departamento"
        value={
          <BadgeList
            items={tList(DepartmentLabels, result.categories.department)}
          />
        }
      />
      <ResultField
        label="Subcategorias"
        value={
          <BadgeList items={tList(SubCategoryLabels, result.categories.sub)} />
        }
      />

      <div className="border-border border-t" />

      {/* Cor */}
      <ResultField
        label="Cor Principal"
        value={t(ColorLabels, result.color.primary)}
      />
      {result.color.secondary.length > 0 && (
        <ResultField
          label="Cores Secundárias"
          value={
            <BadgeList items={tList(ColorLabels, result.color.secondary)} />
          }
        />
      )}
      <ResultField
        label="Estampa"
        value={<BadgeList items={tList(PatternLabels, result.color.pattern)} />}
      />
      <ResultField
        label="Multicolorido"
        value={result.color.is_multicolor ? "Sim" : "Não"}
      />

      <div className="border-border border-t" />

      {/* Modelagem */}
      {result.shape && result.shape.length > 0 && (
        <ResultField
          label="Silhueta"
          value={<BadgeList items={tList(ShapeLabels, result.shape)} />}
        />
      )}
      {result.fit && result.fit.length > 0 && (
        <ResultField
          label="Caimento (Fit)"
          value={<BadgeList items={tList(FitLabels, result.fit)} />}
        />
      )}

      <ResultField label="Comprimento" value={t(LengthLabels, result.length)} />
      <ResultField
        label="Condição"
        value={t(ConditionLabels, result.condition)}
      />

      <div className="border-border border-t" />

      {/* Manga */}

      {result.sleeve && (
        <>
          <ResultField
            label="Manga — Comprimento"
            value={t(SleeveLengthLabels, result.sleeve.length)}
          />
          <ResultField
            label="Manga — Tipo"
            value={
              <BadgeList items={tList(SleeveTypeLabels, result.sleeve.type)} />
            }
          />
          <ResultField
            label="Manga — Construção"
            value={t(SleeveConstructionLabels, result.sleeve.construction)}
          />
        </>
      )}

      <div className="border-border border-t" />

      {/* Decote e Costas */}
      {result.neckline && (
        <ResultField
          label="Decote"
          value={t(NecklineLabels, result.neckline)}
        />
      )}
      {result.backDetails && result.backDetails.length > 0 && (
        <ResultField
          label="Detalhes Costas"
          value={
            <BadgeList items={tList(BackDetailLabels, result.backDetails)} />
          }
        />
      )}

      <div className="border-border border-t" />

      {/* Acabamento e Fechamento */}
      <ResultField
        label="Acabamento"
        value={<BadgeList items={tList(FinishLabels, result.finish)} />}
      />
      <ResultField
        label="Fechamento"
        value={<BadgeList items={tList(ClosureLabels, result.closure)} />}
      />

      {/* Composição do Tecido */}
      {result.composition && result.composition.length > 0 && (
        <>
          <div className="border-border border-t" />
          <ResultField
            label="Composição"
            value={
              <BadgeList
                items={result.composition.map(
                  (c) => `${t(FabricFiberLabels, c.fiber)} ${c.percentage}%`
                )}
              />
            }
          />
        </>
      )}

      {/* Bolsos */}
      <ResultField
        label="Bolsos"
        value={
          result.pockets.has_pockets
            ? `Sim (${result.pockets.quantity}) — ${
                tList(PocketTypeLabels, result.pockets.types).join(", ") || "—"
              }`
            : "Não"
        }
      />

      <div className="border-border border-t" />

      {/* Estética e Ocasião */}
      <ResultField
        label="Estética"
        value={<BadgeList items={tList(AestheticLabels, result.aesthetics)} />}
      />
      <ResultField
        label="Ocasião"
        value={<BadgeList items={tList(OccasionLabels, result.occasion)} />}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ImageAnalyzer() {
  const [images, setImages] = React.useState<PendingImage[]>([]);
  const [result, setResult] = React.useState<GarmentClassification | null>(
    null
  );
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
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterShape, setFilterShape] = React.useState("");
  const [filterAesthetic, setFilterAesthetic] = React.useState("");

  // Modal de estimativa de preço
  const [priceModalOpen, setPriceModalOpen] = React.useState(false);
  const [priceModalEntry, setPriceModalEntry] =
    React.useState<AnalysisEntry | null>(null);
  const [priceRefreshKey, setPriceRefreshKey] = React.useState(0);

  // Modal de Virtual Try-On
  const [tryOnModalOpen, setTryOnModalOpen] = React.useState(false);
  const [tryOnModalEntry, setTryOnModalEntry] =
    React.useState<AnalysisEntry | null>(null);

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
      if (
        filterCategory &&
        entry.categories?.main?.toLowerCase() !== filterCategory
      )
        return false;
      if (
        filterShape &&
        !(entry.shape ?? []).some((s) => s.toLowerCase() === filterShape)
      )
        return false;
      if (
        filterAesthetic &&
        !(entry.aesthetics ?? []).some(
          (a) => a.toLowerCase() === filterAesthetic
        )
      )
        return false;
      return true;
    });
  }, [history, filterCategory, filterShape, filterAesthetic]);

  const categoryOptions = React.useMemo(
    () => uniqueMainCategories(history),
    [history]
  );
  const shapeOptions = React.useMemo(() => uniqueShapes(history), [history]);
  const aestheticOptions = React.useMemo(
    () => uniqueAesthetics(history),
    [history]
  );

  const hasActiveFilters = filterCategory || filterShape || filterAesthetic;
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
            <AnalysisResultDisplay result={result} />

            {/* Uso de tokens e custo estimado */}
            {resultUsage && (
              <div className="border-border mt-4 border-t pt-3">
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
                      {resultUsage.candidatesTokenCount.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {resultUsage.thoughtsTokenCount > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px]">
                        Tokens thinking
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {resultUsage.thoughtsTokenCount.toLocaleString("pt-BR")}
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
                {/* Categoria Principal */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filter-category"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Categoria
                  </label>
                  <select
                    id="filter-category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">Todas</option>
                    {categoryOptions.map((v) => (
                      <option key={v} value={v}>
                        {t(MainCategoryLabels, v)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shape */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filter-shape"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Silhueta
                  </label>
                  <select
                    id="filter-shape"
                    value={filterShape}
                    onChange={(e) => setFilterShape(e.target.value)}
                    className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">Todas</option>
                    {shapeOptions.map((v) => (
                      <option key={v} value={v}>
                        {t(ShapeLabels, v)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aesthetic */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filter-aesthetic"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
                  >
                    Estética
                  </label>
                  <select
                    id="filter-aesthetic"
                    value={filterAesthetic}
                    onChange={(e) => setFilterAesthetic(e.target.value)}
                    className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">Todas</option>
                    {aestheticOptions.map((v) => (
                      <option key={v} value={v}>
                        {t(AestheticLabels, v)}
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
                      setFilterCategory("");
                      setFilterShape("");
                      setFilterAesthetic("");
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
                    {entry.suggestedTitle && (
                      <span className="text-sm font-semibold leading-snug">
                        {entry.suggestedTitle}
                      </span>
                    )}

                    {/* Categoria */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                        Categoria
                      </span>
                      <span className="text-xs">
                        {entry.categories?.main
                          ? t(MainCategoryLabels, entry.categories.main)
                          : "—"}
                      </span>
                    </div>
                    {entry.suggestedDescription && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Descrição
                        </span>
                        <p className="text-xs leading-relaxed text-foreground/80 line-clamp-3">
                          {entry.suggestedDescription}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Cor
                        </span>
                        <span className="text-xs">
                          {entry.color?.primary
                            ? t(ColorLabels, entry.color.primary)
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Silhueta
                        </span>
                        <span className="text-xs">
                          {(entry.shape ?? []).length > 0
                            ? tList(ShapeLabels, entry.shape!).join(", ")
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Estampa
                        </span>
                        <span className="text-xs">
                          {(entry.color?.pattern ?? []).length > 0
                            ? tList(PatternLabels, entry.color.pattern).join(
                                ", "
                              )
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Caimento
                        </span>
                        <span className="text-xs">
                          {(entry.fit ?? []).length > 0
                            ? tList(FitLabels, entry.fit!).join(", ")
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Ocasião
                        </span>
                        <span className="text-xs">
                          {(entry.occasion ?? []).length > 0
                            ? tList(OccasionLabels, entry.occasion).join(", ")
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Comprimento
                        </span>
                        <span className="text-xs">
                          {entry.length ? t(LengthLabels, entry.length) : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Departamento
                        </span>
                        <span className="text-xs">
                          {(entry.categories?.department ?? []).length > 0
                            ? tList(
                                DepartmentLabels,
                                entry.categories.department
                              ).join(", ")
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                          Condição
                        </span>
                        <span className="text-xs">
                          {entry.condition
                            ? t(ConditionLabels, entry.condition)
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {(entry.aesthetics ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {entry.aesthetics.map((a) => (
                          <Badge
                            key={a}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {t(AestheticLabels, a)}
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full cursor-pointer"
                      onClick={() => {
                        setTryOnModalEntry(entry);
                        setTryOnModalOpen(true);
                      }}
                    >
                      Try On
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

      {/* Modal de Virtual Try-On */}
      <TryOnModal
        entry={tryOnModalEntry}
        open={tryOnModalOpen}
        onOpenChange={setTryOnModalOpen}
      />
    </div>
  );
}
