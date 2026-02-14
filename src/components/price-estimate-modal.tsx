import * as React from "react";
import type { AnalysisEntry, PriceEstimateEntry } from "@/types/clothing";
import { estimatePrice, type PriceEstimate } from "@/lib/gemini-pricing";
import {
  loadPriceHistoryForItem,
  savePriceEstimate,
  deletePriceEstimate,
  computeItemAverages,
  type ItemPriceAverage,
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
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon } from "@hugeicons/core-free-icons";

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface PriceEstimateModalProps {
  entry: AnalysisEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceEstimateModal({
  entry,
  open,
  onOpenChange,
}: PriceEstimateModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PriceEstimate | null>(null);

  // Histórico de estimativas deste item
  const [itemHistory, setItemHistory] = React.useState<PriceEstimateEntry[]>(
    []
  );
  const [averages, setAverages] = React.useState<ItemPriceAverage | null>(null);

  function refreshHistory() {
    if (!entry) {
      setItemHistory([]);
      setAverages(null);
      return;
    }
    const history = loadPriceHistoryForItem(entry.id);
    setItemHistory(history);
    setAverages(computeItemAverages(history));
  }

  // Carrega histórico do item quando o modal abre; reseta quando fecha
  React.useEffect(() => {
    if (open) {
      refreshHistory();
    } else {
      setLoading(false);
      setError(null);
      setResult(null);
      setItemHistory([]);
      setAverages(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.id]);

  async function handleEstimate() {
    if (!entry) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { estimate, usage } = await estimatePrice(entry);
      setResult(estimate);

      // Salva no histórico vinculado a este item
      const priceEntry: PriceEstimateEntry = {
        id: crypto.randomUUID(),
        analysisId: entry.id,
        category: entry.categories.main,
        marca: entry.brand || "sem marca",
        qualidade: entry.condition,
        suggestedTitle: entry.suggestedTitle,
        precoMinimo: estimate.min_price,
        precoMaximo: estimate.max_price,
        precoSugerido: estimate.suggested_price,
        justificativa: estimate.justification,
        estimatedAt: new Date().toISOString(),
        usage,
      };
      savePriceEstimate(priceEntry);
      refreshHistory();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `Erro ao estimar preço: ${err.message}`
          : "Erro desconhecido ao estimar preço."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteEstimate(id: string) {
    deletePriceEstimate(id);
    refreshHistory();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg sm:max-w-lg max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Estimar Preço</AlertDialogTitle>
          <AlertDialogDescription>
            {entry
              ? `Estimar preço de "${entry.suggestedTitle}" (${
                  entry.brand || "sem marca"
                } · ${entry.condition}).`
              : "Selecione um item para estimar o preço."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-2">
              <div className="border-primary h-4 w-4 animate-spin border-2 border-t-transparent" />
              <span className="text-muted-foreground text-xs">
                Estimando preço...
              </span>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-destructive text-xs">{error}</p>}

          {/* Result */}
          {result && (
            <div className="bg-muted/50 border border-border rounded-md p-3 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Mínimo
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {fmtBRL.format(result.min_price)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Sugerido
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {fmtBRL.format(result.suggested_price)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Máximo
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {fmtBRL.format(result.max_price)}
                  </span>
                </div>
              </div>
              <div className="border-border border-t pt-2">
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                  Justificativa
                </span>
                <p className="text-xs leading-relaxed text-foreground/80 mt-0.5">
                  {result.justification}
                </p>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/*  Média das estimativas deste item                         */}
          {/* -------------------------------------------------------- */}
          {averages && averages.count >= 2 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3 mt-1">
              <span className="text-xs font-semibold tracking-tight">
                Média das Estimativas
                <span className="text-muted-foreground font-normal ml-1">
                  ({averages.count} estimativas)
                </span>
              </span>
              <div className="bg-muted/40 border border-border rounded-md px-3 py-2 grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Média Mín.
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {fmtBRL.format(averages.avgMinimo)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Média Sug.
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-primary">
                    {fmtBRL.format(averages.avgSugerido)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Média Máx.
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {fmtBRL.format(averages.avgMaximo)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/*  Histórico de estimativas deste item                      */}
          {/* -------------------------------------------------------- */}
          {itemHistory.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3 mt-1">
              <span className="text-xs font-semibold tracking-tight">
                Histórico de Estimativas
              </span>
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                {itemHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group/item bg-muted/30 border border-border rounded-md px-3 py-2 flex flex-col gap-1.5 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {item.marca}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ·
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.qualidade}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 cursor-pointer"
                        onClick={() => handleDeleteEstimate(item.id)}
                        title="Remover estimativa"
                      >
                        <HugeiconsIcon
                          icon={Delete01Icon}
                          className="h-3 w-3"
                        />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          Mínimo
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums">
                          {fmtBRL.format(item.precoMinimo)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          Sugerido
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums text-primary">
                          {fmtBRL.format(item.precoSugerido)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          Máximo
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums">
                          {fmtBRL.format(item.precoMaximo)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.estimatedAt).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                      {item.usage && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          Custo: {fmtBRL.format(item.usage.estimatedCostBRL)}{" "}
                          <span className="opacity-60">
                            (US$ {item.usage.estimatedCostUSD.toFixed(4)})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Fechar</AlertDialogCancel>
          {!result && (
            <Button onClick={handleEstimate} disabled={loading}>
              {loading ? "Estimando..." : "Estimar Preço"}
            </Button>
          )}
          {result && (
            <Button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              variant="outline"
            >
              Nova Estimativa
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
