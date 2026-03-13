import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { GitCompareArrows, CheckCircle2, XCircle, AlertTriangle, Loader2, Trash2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Source = "bank_statement" | "invoice" | "payment_gateway" | "order";
const sourceLabels: Record<Source, string> = {
  bank_statement: "Bank Statement", invoice: "Invoice", payment_gateway: "Payment Gateway", order: "Order Records",
};
interface RunResult { 
  runId: string; 
  batchAId?: string; 
  batchBId?: string; 
  matched: number; 
  unmatched: number; 
  discrepancy: number; 
  total: number; 
}

export default function Reconcile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sourceA, setSourceA] = useState<Source>("bank_statement");
  const [sourceB, setSourceB] = useState<Source>("payment_gateway");
  const [dateTolerance, setDateTolerance] = useState(3);
  const [amountTolerance, setAmountTolerance] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getSettings().then((s) => {
      if (s.dateTolerance !== undefined) setDateTolerance(s.dateTolerance);
      if (s.amountTolerance !== undefined) setAmountTolerance(s.amountTolerance);
    }).catch(() => { });
  }, [user]);

  const runReconciliation = async () => {
    if (!user) return;
    setIsRunning(true);
    setResult(null);
    try {
      const res = await api.runReconciliation({ sourceA, sourceB, dateTolerance, amountTolerance });
      setResult(res as RunResult);
      toast({ title: "Reconciliation complete", description: `${res.matched} matches found.` });
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm("This will permanently delete ALL imported transactions, matches, and reconciliation history. Continue?")) return;
    try {
      await api.purgeData();
      setResult(null);
      toast({ title: "System reset", description: "All data has been cleared." });
    } catch (err: unknown) {
      toast({ title: "Clear failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleViewMatches = () => {
    if (!result) return;
    navigate(`/review?runId=${result.runId}`);
  };

  const handleViewUnmatched = () => {
    if (!result) return;
    const ids = [result.batchAId, result.batchBId].filter(Boolean).join(",");
    navigate(`/transactions?status=unmatched&batchId=${ids}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Auto-Reconciliation</h1>
        <p className="text-sm text-muted-foreground">Match transactions by amount and date proximity</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure Matching</CardTitle>
          <CardDescription>Select two data sources to reconcile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source A</Label>
              <Select value={sourceA} onValueChange={(v) => setSourceA(v as Source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source B</Label>
              <Select value={sourceB} onValueChange={(v) => setSourceB(v as Source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Tolerance (days)</Label>
              <Input type="number" min={0} max={30} value={dateTolerance} onChange={(e) => setDateTolerance(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Amount Tolerance</Label>
              <Input type="number" min={0} step={0.01} value={amountTolerance} onChange={(e) => setAmountTolerance(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <Button onClick={runReconciliation} disabled={isRunning} className="w-full">
            {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…</> : <><GitCompareArrows className="mr-2 h-4 w-4" /> Run Reconciliation</>}
          </Button>
          <div className="pt-2 border-t mt-4">
            <Button variant="ghost" size="sm" onClick={handlePurge} className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Clear All Previous Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center rounded-lg bg-success/10 p-4">
                <CheckCircle2 className="mb-2 h-6 w-6 text-success" />
                <span className="font-display text-2xl font-bold">{result.matched}</span>
                <span className="text-xs text-muted-foreground">Matched</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-muted p-4">
                <XCircle className="mb-2 h-6 w-6 text-muted-foreground" />
                <span className="font-display text-2xl font-bold">{result.unmatched}</span>
                <span className="text-xs text-muted-foreground">Unmatched</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-warning/10 p-4">
                <AlertTriangle className="mb-2 h-6 w-6 text-warning" />
                <span className="font-display text-2xl font-bold">{result.discrepancy}</span>
                <span className="text-xs text-muted-foreground">Discrepancies</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button onClick={() => navigate(`/reports/${result.runId}`)} className="w-full bg-purple-600 hover:bg-purple-700">
                <FileText className="mr-2 h-4 w-4" /> View Detailed Comparison Report
              </Button>
              <div className="flex gap-4">
                <Button onClick={handleViewMatches} variant="outline" className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Quick Review
                </Button>
                <Button onClick={handleViewUnmatched} variant="outline" className="flex-1">
                  <XCircle className="mr-2 h-4 w-4" /> View Unmatched
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
