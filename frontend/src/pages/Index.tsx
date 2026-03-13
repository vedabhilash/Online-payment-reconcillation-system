import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Upload, GitCompareArrows, DollarSign, FileText, CheckCircle2, CopyMinus, HelpCircle, Clock, AlertTriangle, Layers } from "lucide-react";
import { safeDate } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

interface RunStats { total: number; matched: number; unmatched: number; discrepancy: number; timingDifference: number; }
interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  recentTransactions: any[];
}

const PIE_COLORS = ["hsl(152,60%,40%)", "hsl(220,10%,70%)", "hsl(38,92%,50%)", "hsl(200,80%,50%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runStats, setRunStats] = useState<RunStats>({ total: 0, matched: 0, unmatched: 0, discrepancy: 0, timingDifference: 0 });
  const [finStats, setFinStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getStats().then((data) => setRunStats({
      total: data.total || 0,
      matched: data.matched || 0,
      unmatched: data.unmatched || 0,
      discrepancy: data.discrepancy || 0,
      timingDifference: data.timingDifference || 0
    })).catch(() => { });

    api.getAdminDashboardStats().then(setFinStats).catch(() => { });
  }, [user]);

  const pieData = [
    { name: "Matched", value: Number(runStats.matched) || 0 },
    { name: "Unmatched", value: Number(runStats.unmatched) || 0 },
    { name: "Discrepancy", value: Number(runStats.discrepancy) || 0 },
    { name: "Timing Diff", value: Number(runStats.timingDifference) || 0 },
  ].filter((d) => d.value > 0);

  const reconMetrics = [
    { label: "Total TXNs", value: runStats.total, icon: Layers, color: "text-primary" },
    { label: "Matched", value: runStats.matched, icon: CheckCircle2, color: "text-success" },
    { label: "Unmatched", value: runStats.unmatched, icon: HelpCircle, color: "text-muted-foreground" },
    { label: "Mismatches", value: runStats.discrepancy, icon: AlertTriangle, color: "text-warning" },
    { label: "Timing Diff", value: runStats.timingDifference, icon: Clock, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Monitor your financial health and reconciliation status with real-time insights.</p>
      </div>

      {/* Financial Health Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: `$${(finStats?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: "text-primary" },
          { label: "Paid Invoices", value: finStats?.paidInvoices || 0, icon: CheckCircle2, color: "text-success" },
          { label: "Pending Invoices", value: finStats?.unpaidInvoices || 0, icon: CopyMinus, color: "text-warning" },
          { label: "Total Invoices", value: finStats?.totalInvoices || 0, icon: FileText, color: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="glass border-0 shadow-lg shadow-black/5 rounded-3xl">
            <CardContent className="flex items-center gap-5 p-6">
              <div className={`rounded-2xl bg-black/5 dark:bg-white/5 p-4 ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
                <p className="text-2xl font-black mt-1">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reconciliation Engine Metrics */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Reconciliation Overview</h2>
          <Button onClick={() => navigate('/reconcile')} size="sm" className="rounded-full w-full sm:w-auto">
            <GitCompareArrows className="mr-2 h-4 w-4" /> Run Engine
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {reconMetrics.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 bg-muted/30 shadow-none rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-sm ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-xl font-black">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Card className="glass border-0 shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-bold">Matching Distribution</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Automatic vs Manual investigation needs</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-8">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '1rem', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50">
                  <GitCompareArrows className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-sm font-medium">No results to show yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-0 shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Recent Activities</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Latest transactions across sources</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate('/transactions')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {finStats?.recentTransactions?.map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-8 py-4 hover:bg-black/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[180px]">{tx.description || "Transaction"}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{safeDate(tx.transactionDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">${tx.amount.toFixed(2)}</p>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4 mt-1">{tx.source.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
              {(!finStats?.recentTransactions || finStats.recentTransactions.length === 0) && (
                <div className="p-12 text-center text-sm text-muted-foreground font-medium">No recent transactions found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-0 shadow-lg shadow-primary/20 rounded-3xl overflow-hidden group cursor-pointer" onClick={() => navigate('/upload')}>
          <CardContent className="p-8 flex flex-col justify-between h-full">
            <Upload className="h-10 w-10 mb-6 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-2xl font-black mb-2">Import Data</h3>
              <p className="text-primary-foreground/70 text-sm font-medium">Upload Bank Statements or Gateway Reports to start.</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-black dark:bg-zinc-900 text-white border-0 shadow-xl rounded-3xl overflow-hidden group cursor-pointer" onClick={() => navigate('/reconcile')}>
          <CardContent className="p-8 flex flex-col justify-between h-full">
            <GitCompareArrows className="h-10 w-10 mb-6 group-hover:rotate-180 transition-transform duration-500" />
            <div>
              <h3 className="text-2xl font-black mb-2">Run Match</h3>
              <p className="text-white/60 text-sm font-medium">Trigger the AI reconciliation engine to auto-match pairs.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-800 border-0 shadow-xl rounded-3xl overflow-hidden group cursor-pointer" onClick={() => navigate('/review')}>
          <CardContent className="p-8 flex flex-col justify-between h-full">
            <CheckCircle2 className="h-10 w-10 mb-6 text-primary group-hover:bounce transition-all" />
            <div>
              <h3 className="text-2xl font-black mb-2">Review Results</h3>
              <p className="text-muted-foreground text-sm font-medium">Verify automated results and handle edge cases manually.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
