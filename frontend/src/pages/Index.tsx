import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowUpRight, Upload, GitCompareArrows, DollarSign, FileText, CheckCircle2, CopyMinus
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

interface RunStats { matched: number; unmatched: number; discrepancy: number; }
interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  recentTransactions: any[];
}

const PIE_COLORS = ["hsl(152,60%,40%)", "hsl(220,10%,70%)", "hsl(38,92%,50%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runStats, setRunStats] = useState<RunStats>({ matched: 0, unmatched: 0, discrepancy: 0 });
  const [finStats, setFinStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getStats().then((data) => setRunStats({
      matched: data.matched || 0,
      unmatched: data.unmatched || 0,
      discrepancy: data.discrepancy || 0
    })).catch(() => { });

    api.getAdminDashboardStats().then(setFinStats).catch(() => { });
  }, [user]);

  const pieData = [
    { name: "Matched", value: runStats.matched },
    { name: "Unmatched", value: runStats.unmatched },
    { name: "Discrepancy", value: runStats.discrepancy },
  ].filter((d) => d.value > 0);

  const summaryCards = [
    { label: "Total Revenue", value: `$${finStats?.totalRevenue?.toFixed(2) || '0.00'}`, icon: DollarSign, color: "text-primary" },
    { label: "Total Invoices", value: finStats?.totalInvoices || 0, icon: FileText, color: "text-muted-foreground" },
    { label: "Paid Invoices", value: finStats?.paidInvoices || 0, icon: CheckCircle2, color: "text-success" },
    { label: "Pending Invoices", value: finStats?.unpaidInvoices || 0, icon: CopyMinus, color: "text-warning" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Monitor your financial health and reconciliation status with real-time insights.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="glass border-0 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-3xl">
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

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Card className="glass border-0 shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-bold">Reconciliation Status</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Distribution of transaction matching</p>
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
                <p className="font-medium">No transaction data yet. Upload files to run reconciliation.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-0 shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Recent Transactions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Your latest billing activity</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")} className="rounded-full px-4 hover:bg-black/5 font-bold text-primary">
              View All <ArrowUpRight className="ml-1 h-3.3 w-3.3" />
            </Button>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {finStats?.recentTransactions?.length ? (
              <div className="space-y-4">
                {finStats.recentTransactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between rounded-2xl border border-black/[0.03] dark:border-white/[0.03] p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[150px]">
                          {tx.description || "Unknown Transaction"}
                        </p>
                        <div className="flex gap-2 items-center mt-0.5 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                          <span>{tx.source}</span>
                          <span className="opacity-30">•</span>
                          <span>{format(new Date(tx.date), 'MMM dd')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-black text-base text-foreground tracking-tight">${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <Badge variant={tx.status === 'Matched' ? 'default' : 'secondary'} className="text-[9px] h-4.5 rounded-full px-2 font-black uppercase tracking-widest shadow-sm">
                        {tx.status || 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50">
                  <FileText className="h-8 w-8 opacity-20" />
                </div>
                <p className="font-medium">No recent transactions found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
