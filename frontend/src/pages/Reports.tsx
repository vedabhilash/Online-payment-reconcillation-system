import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, FileText, PieChart } from "lucide-react";
import { safeDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Run {
  _id: string; sourceA: string; sourceB: string;
  matchedCount: number; unmatchedCount: number; discrepancyCount: number;
  totalCompared: number; status: string; createdAt: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getRuns().then(setRuns).catch(() => { });
  }, [user]);

  const chartData = (runs || []).slice(0, 10).reverse().map((r) => ({
    name: safeDate(r.createdAt, 'MMM dd'),
    Matched: r.matchedCount || 0,
    Unmatched: r.unmatchedCount || 0,
    Discrepancies: r.discrepancyCount || 0,
  }));

  const exportCSV = () => {
    if (!runs || !Array.isArray(runs)) return;
    const header = "Date,Source A,Source B,Matched,Unmatched,Discrepancies,Total,Status\n";
    const rows = runs.map((r) =>
      `${safeDate(r.createdAt)},${r.sourceA},${r.sourceB},${r.matchedCount},${r.unmatchedCount},${r.discrepancyCount},${r.totalCompared},${r.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reconciliation-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewSummary = async (runId: string) => {
    setSelectedRunId(runId);
    setLoadingSummary(true);
    try {
      const data = await api.getRunSummary(runId);
      setSummary(data);
    } catch (err) {
      toast({ title: "Failed to load summary", variant: "destructive" });
    } finally {
      setLoadingSummary(false);
    }
  };

  const COLORS = ['#10b981', '#6b7280', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Reconciliation analytics and exports</p>
        </div>
        {runs && runs.length > 0 && (
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        )}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Reconciliation Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="Matched" fill="hsl(152,60%,40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Unmatched" fill="hsl(220,10%,70%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Discrepancies" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All Reconciliation Runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Sources</TableHead><TableHead>Matched</TableHead>
                <TableHead>Unmatched</TableHead><TableHead>Discrepancies</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs && runs.length > 0 ? runs.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="text-sm">{safeDate(r.createdAt)}</TableCell>
                  <TableCell className="text-sm">{r.sourceA.replace("_", " ")} ↔ {r.sourceB.replace("_", " ")}</TableCell>
                  <TableCell className="text-sm text-success">{r.matchedCount}</TableCell>
                  <TableCell className="text-sm">{r.unmatchedCount}</TableCell>
                  <TableCell className="text-sm text-warning">{r.discrepancyCount}</TableCell>
                  <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewSummary(r._id)}>
                      <FileText className="h-4 w-4 mr-2" /> Summary
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No runs yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRunId} onOpenChange={(open) => !open && setSelectedRunId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reconciliation Summary Report</DialogTitle>
            <DialogDescription>
              Detailed breakdown for {summary?.run?.sourceA.split('_')[0]} vs {summary?.run?.sourceB.split('_')[0]} session.
            </DialogDescription>
          </DialogHeader>
          
          {loadingSummary ? (
            <div className="py-12 text-center animate-pulse">Loading summary data...</div>
          ) : summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border rounded-2xl p-6 bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Total Transactions</span>
                    <span className="font-bold">{summary.totalTransactions}</span>
                  </div>
                  <div className="flex items-center justify-between text-success border-b pb-2">
                    <span className="text-sm">Matched Transactions</span>
                    <span className="font-bold">{summary.statusBreakdown.matched}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground border-b pb-2">
                    <span className="text-sm font-medium">Auto-Reconciled</span>
                    <span className="font-medium">{summary.run.matchedCount}</span>
                  </div>
                   <div className="flex items-center justify-between text-blue-500 border-b pb-2">
                    <span className="text-sm">Timing Differences</span>
                    <span className="font-bold">{summary.statusBreakdown.timing_difference}</span>
                  </div>
                  <div className="flex items-center justify-between text-orange-500 border-b pb-2">
                    <span className="text-sm">Adjusted (Fee/Refund)</span>
                    <span className="font-bold">{summary.statusBreakdown.adjusted}</span>
                  </div>
                  <div className="flex items-center justify-between text-destructive">
                    <span className="text-sm">Unresolved Exception</span>
                    <span className="font-bold">{summary.statusBreakdown.exception + summary.statusBreakdown.unmatched}</span>
                  </div>
                </div>

                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePie>
                      <Pie
                        data={[
                          { name: 'Matched', value: summary.statusBreakdown.matched },
                          { name: 'Adjusted', value: summary.statusBreakdown.adjusted + summary.statusBreakdown.timing_difference },
                          { name: 'Unmatched', value: summary.statusBreakdown.unmatched + summary.statusBreakdown.exception },
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </RePie>
                  </ResponsiveContainer>
                </div>
              </div>

              {Object.keys(summary.classificationBreakdown).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cause Classification</h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(summary.classificationBreakdown).map(([key, count]) => (
                      <div key={key} className="p-3 border rounded-xl bg-card">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold truncate">{key.replace('_', ' ')}</p>
                        <p className="text-xl font-black">{count as number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-primary uppercase">Final Balance Confirmation</p>
                    <p className="text-xs text-muted-foreground">All matched, adjusted, and timing differences resolved.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">
                      {((summary.statusBreakdown.matched + summary.statusBreakdown.timing_difference + summary.statusBreakdown.adjusted) / summary.totalTransactions * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">RECONCILED</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRunId(null)}>Close</Button>
            <Button onClick={() => window.print()} className="bg-black hover:bg-black/90 text-white">
              <Download className="mr-2 h-4 w-4" /> Print PDF Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
