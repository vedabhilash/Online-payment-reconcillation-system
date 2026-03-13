import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { safeDate } from "@/lib/utils";
import { CheckCircle2, XCircle, ArrowLeft, Search, Clock, BadgeCent, History, AlertTriangle, ArrowRightLeft, RotateCcw } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

interface MatchRow {
  id: string; confidence: number; match_type: string; status: string; notes: string | null;
  transaction_a: { id: string; source: string; amount: number; transaction_date: string; description: string | null; reference_id: string | null };
  transaction_b: { id: string; source: string; amount: number; transaction_date: string; description: string | null; reference_id: string | null };
}

interface TransactionRow {
  _id: string; source: string; amount: number; transactionDate: string; description: string | null; referenceId: string | null;
  status: string; category?: string; adjustmentNotes?: string;
}

export default function Review() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("runId");
  
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [unmatched, setUnmatched] = useState<TransactionRow[]>([]);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [adjustmentCategories, setAdjustmentCategories] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!user) return;
    try {
      const [matchesData, unmatchedData] = await Promise.all([
        api.getMatches({ runId: runId || undefined }),
        api.getTransactions({ status: "unmatched", runId: runId || undefined })
      ]);
      setMatches(matchesData);
      setUnmatched(unmatchedData);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchData(); }, [user, runId]);

  const handleAction = async (matchId: string, action: "approved" | "rejected") => {
    try {
      await api.updateMatch(matchId, action, noteInput[matchId]);
      toast({ title: action === "approved" ? "Match approved" : "Match rejected" });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleAdjustment = async (txId: string, status: string) => {
    try {
      const category = adjustmentCategories[txId] || "investigating";
      const notes = noteInput[txId] || "";
      await api.adjustTransaction({ transactionId: txId, status, category, notes, runId: runId || undefined });
      toast({ title: "Adjustment applied", description: `Transaction marked as ${status.replace("_", " ")}.` });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const bulkApprove = async () => {
    try {
      const { approved } = await api.bulkApprove();
      toast({ title: "All matches approved", description: `${approved} matches approved.` });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Reconciliation Review</h1>
          <p className="text-sm text-muted-foreground">Investigate unmatched records and approve automated matches</p>
        </div>
        <div className="flex gap-2">
          {runId && (
            <Button variant="outline" size="sm" onClick={() => navigate("/review")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> View All
            </Button>
          )}
          {matches.length > 0 && (
            <Button size="sm" onClick={bulkApprove}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve All ({matches.length})
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="matched" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="matched">Matched Transactions ({matches.length})</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched Investigation ({unmatched.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="matched">
          {matches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {matches.map((m) => (
                <Card key={m.id} className="overflow-hidden border-0 shadow-md">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={(Number(m.confidence) || 0) >= 80 ? "default" : "secondary"}>{(Number(m.confidence) || 0).toFixed(0)}% confidence</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">{m.match_type}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => handleAction(m.id, "approved")}><CheckCircle2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleAction(m.id, "rejected")}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="relative mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background p-1.5 shadow-sm">
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {[m.transaction_a, m.transaction_b].map((tx, i) => tx && (
                          <div key={i} className="rounded-xl border bg-black/[0.02] p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{tx.source.replace("_", " ")}</Badge>
                              <span className="font-mono text-sm font-bold">${(Number(tx.amount) || 0).toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mb-1">{safeDate(tx.transaction_date)}</p>
                            <p className="text-sm font-medium leading-tight truncate">{tx.description || tx.reference_id || "—"}</p>
                          </div>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Add internal notes…"
                        value={noteInput[m.id] || ""}
                        onChange={(e) => setNoteInput((n) => ({ ...n, [m.id]: e.target.value }))}
                        className="h-10 min-h-0 resize-none rounded-xl text-xs bg-muted/20"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-muted p-4"><History className="h-8 w-8 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">No matches found for review.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unmatched">
          {unmatched.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unmatched.map((tx) => (
                  <Card key={tx._id} className="border-0 shadow-md">
                    <CardContent className="p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-muted p-2.5">
                            <Search className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tx.source.replace("_", " ")}</p>
                            <p className="text-lg font-black tracking-tight">${tx.amount.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-muted-foreground">{safeDate(tx.transactionDate)}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{tx.referenceId || "No Reference"}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4 rounded-xl bg-muted/20 p-3">
                        <p className="text-xs font-medium italic text-muted-foreground truncate">"{tx.description || "No description provided"}"</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Classification</Label>
                          <Select 
                            value={adjustmentCategories[tx._id] || ""} 
                            onValueChange={(v) => setAdjustmentCategories(prev => ({ ...prev, [tx._id]: v }))}
                          >
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue placeholder="Categorize issue..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="missing_in_bank">Missing in Bank (Settlement Delay)</SelectItem>
                              <SelectItem value="missing_in_gateway">Missing in Gateway (Manual Entry)</SelectItem>
                              <SelectItem value="amount_mismatch">Amount Mismatch (Fees/Round)</SelectItem>
                              <SelectItem value="status_mismatch">Status Mismatch (Failed/Success)</SelectItem>
                              <SelectItem value="duplicate">Duplicate Transaction</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Internal Investigation Note</Label>
                          <Input 
                            placeholder="Findings..." 
                            className="h-9 text-xs rounded-xl"
                            value={noteInput[tx._id] || ""}
                            onChange={(e) => setNoteInput(prev => ({ ...prev, [tx._id]: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg" onClick={() => handleAdjustment(tx._id, "timing_difference")}>
                          <Clock className="mr-1 h-3 w-3" /> Settled Later
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg" onClick={() => handleAdjustment(tx._id, "adjusted")}>
                          <BadgeCent className="mr-1 h-3 w-3" /> Record Fee
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg" onClick={() => handleAdjustment(tx._id, "adjusted")}>
                          <RotateCcw className="mr-1 h-3 w-3" /> Refund
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg border-warning/50 text-warning hover:bg-warning/10" onClick={() => handleAdjustment(tx._id, "exception")}>
                          <AlertTriangle className="mr-1 h-3 w-3" /> Exception
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-success/10 p-4"><CheckCircle2 className="h-8 w-8 text-success" /></div>
                  <p className="text-sm text-muted-foreground tracking-tight">Everything is reconciled. No unmatched items found!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
