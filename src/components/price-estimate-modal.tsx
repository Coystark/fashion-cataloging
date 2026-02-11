import * as React from "react";
import type { AnalysisEntry } from "@/types/clothing";
import { estimatePrice, type PriceEstimate } from "@/lib/gemini-pricing";
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

  // Reseta estado quando o modal abre/fecha
  React.useEffect(() => {
    if (!open) {
      setQualidade("");
      setMarca("");
      setLoading(false);
      setError(null);
      setResult(null);
    }
  }, [open]);

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

  const canSubmit = qualidade.trim().length > 0 && marca.trim().length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Estimar Preço</AlertDialogTitle>
          <AlertDialogDescription>
            {entry
              ? `Informe a qualidade e marca para estimar o preço de "${entry.titulo_sugerido}".`
              : "Informe a qualidade e marca da peça."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          {/* Qualidade */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="price-qualidade"
              className="text-muted-foreground text-xs font-medium"
            >
              Qualidade / Estado da peça
            </label>
            <Input
              id="price-qualidade"
              type="text"
              placeholder='Ex: "nova com etiqueta", "usada - bom estado", "usada - desgastada"'
              value={qualidade}
              onChange={(e) => setQualidade(e.target.value)}
              disabled={loading}
            />
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
                Estimando preço com Gemini...
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
