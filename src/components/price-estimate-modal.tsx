import * as React from "react";
import type { AnalysisEntry, PriceEstimateEntry } from "@/types/clothing";
import { estimatePrice, type PriceEstimate } from "@/lib/gemini-pricing";
import { CONDICOES } from "@/lib/gemini-analysis";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [qualidade, setQualidade] = React.useState("");
  const [marca, setMarca] = React.useState("");
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

  // Carrega histórico do item quando o modal abre; reseta form quando fecha
  React.useEffect(() => {
    if (open) {
      refreshHistory();
      // Auto-preenche com dados da análise (se disponíveis)
      setQualidade(entry?.condicao || "");
      setMarca(entry?.marca || "");
    } else {
      setQualidade("");
      setMarca("");
      setLoading(false);
      setError(null);
      setResult(null);
      setItemHistory([]);
      setAverages(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.id]);

  async function handleEstimate() {
    if (!entry || !qualidade.trim() || !marca.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { estimate } = await estimatePrice(
        entry,
        qualidade.trim(),
        marca.trim()
      );
      setResult(estimate);

      // Salva no histórico vinculado a este item
      const priceEntry: PriceEstimateEntry = {
        id: crypto.randomUUID(),
        analysisId: entry.id,
        categoria: entry.categoria,
        marca: marca.trim(),
        qualidade: qualidade.trim(),
        tituloSugerido: entry.titulo_sugerido,
        precoMinimo: estimate.precoMinimo,
        precoMaximo: estimate.precoMaximo,
        precoSugerido: estimate.precoSugerido,
        justificativa: estimate.justificativa,
        estimatedAt: new Date().toISOString(),
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

  const canSubmit = qualidade.trim().length > 0 && marca.trim().length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg sm:max-w-lg max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Estimar Preço</AlertDialogTitle>
          <AlertDialogDescription>
            {entry
              ? `Informe a qualidade e marca para estimar o preço de "${entry.titulo_sugerido}".`
              : "Informe a qualidade e marca da peça."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
          {/* Qualidade / Condição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              Condição / Estado da peça
            </label>
            <Select
              value={qualidade}
              onValueChange={setQualidade}
              disabled={loading}
            >
              <SelectTrigger className="w-full capitalize">
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                {CONDICOES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Marca */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="price-marca"
              className="text-muted-foreground text-xs font-medium"
            >
              Marca
            </label>
            <Input
              id="price-marca"
              type="text"
              placeholder='Ex: "Zara", "Farm", "Gucci", "sem marca"'
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              disabled={loading}
            />
          </div>

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
                    {fmtBRL.format(result.precoMinimo)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Sugerido
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {fmtBRL.format(result.precoSugerido)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Máximo
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {fmtBRL.format(result.precoMaximo)}
                  </span>
                </div>
              </div>
              <div className="border-border border-t pt-2">
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                  Justificativa
                </span>
                <p className="text-xs leading-relaxed text-foreground/80 mt-0.5">
                  {result.justificativa}
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
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.estimatedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Fechar</AlertDialogCancel>
          {!result && (
            <Button onClick={handleEstimate} disabled={loading || !canSubmit}>
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
