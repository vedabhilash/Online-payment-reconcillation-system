import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, AlertCircle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { safeDate } from "@/lib/utils";

export default function SessionReport() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user || !runId) return;
    api.getSessionReport(runId).then(setData).catch(() => {});
  }, [user, runId]);

  if (!data) return <div className="p-10 text-center">Loading detailed report...</div>;

  const { run, matches, discrepancies, unmatched } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Session Detail Report</h1>
            <p className="text-sm text-muted-foreground">{run.sourceA.split('_')[0]} ↔ {run.sourceB.split('_')[0]} • {safeDate(run.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-success/60">Auto Matched</p>
            <p className="text-2xl font-black text-success">{run.matchedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-warning/60">Amount Mismatches</p>
            <p className="text-2xl font-black text-warning">{run.discrepancyCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500/60">Timing Differences</p>
            <p className="text-2xl font-black text-blue-500">{run.timingDifferenceCount || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/5 border-muted/20">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unmatched Items</p>
            <p className="text-2xl font-black">{run.unmatchedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Comparison Table</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Transaction</TableHead>
                <TableHead>Gateway Transaction</TableHead>
                <TableHead>Amount (B vs G)</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Perfect Matches */}
              {matches.map((m: any) => (
                <TableRow key={m._id}>
                  <TableCell>
                    <p className="text-sm font-bold">{m.transactionAId?.description || "Bank Entry"}</p>
                    <p className="text-[10px] text-muted-foreground">{safeDate(m.transactionAId?.transactionDate)} • {m.transactionAId?.referenceId || "-"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-bold">{m.transactionBId?.description || "Gateway Entry"}</p>
                    <p className="text-[10px] text-muted-foreground">{safeDate(m.transactionBId?.transactionDate)} • {m.transactionBId?.referenceId || "-"}</p>
                  </TableCell>
                  <TableCell className="text-sm font-mono">${m.transactionAId?.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">$0.00</TableCell>
                  <TableCell><Badge variant="default" className="bg-success/20 text-success border-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Matched</Badge></TableCell>
                </TableRow>
              ))}

              {/* Discrepancies */}
              {discrepancies.map((d: any) => (
                <TableRow key={d._id} className="bg-warning/5">
                  <TableCell>
                    <p className="text-sm font-bold">{d.transactionAId?.description || "Bank Entry"}</p>
                    <p className="text-[10px] text-muted-foreground">{safeDate(d.transactionAId?.transactionDate)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-bold">{d.transactionBId?.description || "Gateway Entry"}</p>
                    <p className="text-[10px] text-muted-foreground">{safeDate(d.transactionBId?.transactionDate)}</p>
                  </TableCell>
                  <TableCell className="text-sm font-mono truncate max-w-[120px]">
                    ${d.transactionAId?.amount.toFixed(2)} vs ${d.transactionBId?.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-warning">-${d.difference.toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-warning border-warning/50"><AlertCircle className="h-3 w-3 mr-1" /> Mismatch</Badge></TableCell>
                </TableRow>
              ))}

              {/* Unmatched */}
              {unmatched.map((u: any) => (
                <TableRow key={u._id} className="opacity-60">
                  <TableCell>
                    {u.source === run.sourceA ? (
                      <div>
                        <p className="text-sm font-bold">{u.description || "Unmatched Bank"}</p>
                        <p className="text-[10px] text-muted-foreground">{safeDate(u.transactionDate)}</p>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {u.source === run.sourceB ? (
                      <div>
                        <p className="text-sm font-bold">{u.description || "Unmatched Gateway"}</p>
                        <p className="text-[10px] text-muted-foreground">{safeDate(u.transactionDate)}</p>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono">${u.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm font-mono">—</TableCell>
                  <TableCell><Badge variant="secondary"><HelpCircle className="h-3 w-3 mr-1" /> Missing</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
