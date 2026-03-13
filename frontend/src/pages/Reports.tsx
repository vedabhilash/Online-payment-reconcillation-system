import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3 } from "lucide-react";
import { safeDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Run {
  _id: string; sourceA: string; sourceB: string;
  matchedCount: number; unmatchedCount: number; discrepancyCount: number;
  totalCompared: number; status: string; createdAt: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);

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
    const header = "Date,Source A,Source B,Matched,Unmatched,Discrepancies,Timing Diff,Adjusted,Exceptions,Total,Status\n";
    const rows = runs.map((r: any) =>
      `${safeDate(r.createdAt)},${r.sourceA},${r.sourceB},${r.matchedCount},${r.unmatchedCount},${r.discrepancyCount},${r.timingDifferenceCount || 0},${r.adjustedCount || 0},${r.exceptionCount || 0},${r.totalCompared},${r.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reconciliation-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

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
                <TableHead>Date</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Unmatched</TableHead>
                <TableHead>Timing Diff</TableHead>
                <TableHead>Adjusted</TableHead>
                <TableHead>Exceptions</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs && runs.length > 0 ? runs.map((r: any) => (
                <TableRow key={r._id}>
                  <TableCell className="text-sm">{safeDate(r.createdAt)}</TableCell>
                  <TableCell className="text-sm">{r.sourceA.split('_')[0]} ↔ {r.sourceB.split('_')[0]}</TableCell>
                  <TableCell className="text-sm text-success font-bold">{r.matchedCount}</TableCell>
                  <TableCell className="text-sm">{r.unmatchedCount}</TableCell>
                  <TableCell className="text-sm text-blue-500">{r.timingDifferenceCount || 0}</TableCell>
                  <TableCell className="text-sm text-purple-500">{r.adjustedCount || 0}</TableCell>
                  <TableCell className="text-sm text-destructive">{r.exceptionCount || 0}</TableCell>
                  <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No runs yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
