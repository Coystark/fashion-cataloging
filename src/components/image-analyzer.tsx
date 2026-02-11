import * as React from "react";
import { analyzeClothingImage } from "@/lib/gemini";
import type { ClothingAnalysis, AnalysisEntry } from "@/types/clothing";
import {
  loadHistory,
  saveAnalysis,
  deleteAnalysis,
  clearHistory,
  resizeImageDataUrl,
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
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const LABELS: Record<keyof ClothingAnalysis, string> = {
  categoria: "Categoria",
  corte_silhueta: "Corte / Silhueta",
  detalhes_estilo: "Detalhes de Estilo",
  estampa: "Estampa",
};

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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ImageAnalyzer() {
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageBase64, setImageBase64] = React.useState<string | null>(null);
  const [imageMimeType, setImageMimeType] =
    React.useState<string>("image/jpeg");
  const [result, setResult] = React.useState<ClothingAnalysis | null>(null);
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Carrega histórico ao montar
  React.useEffect(() => {
    setHistory(loadHistory());
  }, []);

  /* ---- upload helpers ---- */

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

  /* ---- análise ---- */

  async function handleAnalyze() {
    if (!imageBase64 || !imagePreview) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeClothingImage(
        imageBase64,
        imageMimeType,
        userDescription
      );
      setResult(analysis);

      // Cria thumbnail reduzida e salva no histórico
      const thumbnail = await resizeImageDataUrl(imagePreview);
      const entry: AnalysisEntry = {
        ...analysis,
        id: crypto.randomUUID(),
        imagePreview: thumbnail,
        analyzedAt: new Date().toISOString(),
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
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
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

  /* ---- render ---- */

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
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
                  descrição com a imagem.
                </span>
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
                  <div className="bg-muted relative flex items-center justify-center">
                    <img
                      src={entry.imagePreview}
                      alt="Thumbnail"
                      className="h-40 w-full object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                      title="Remover análise"
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="flex flex-col gap-2 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {entry.categoria}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(entry.analyzedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                        Corte / Silhueta
                      </span>
                      <span className="text-xs capitalize">
                        {entry.corte_silhueta}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                        Estampa
                      </span>
                      <span className="text-xs capitalize">
                        {entry.estampa}
                      </span>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
