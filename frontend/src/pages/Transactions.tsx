import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { safeDate } from "@/lib/utils";
import { Search, Trash2, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Transaction {
  _id: string; source: string; referenceId: string | null; description: string | null;
  amount: number; currency: string; transactionDate: string; status: string;
}

interface Run {
  _id: string; sourceA: string; sourceB: string; createdAt: string;
  matchedCount: number; unmatchedCount: number;
}

const sourceLabels: Record<string, string> = {
  bank_statement: "Bank", invoice: "Invoice", payment_gateway: "Gateway", order: "Order",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  matched: "default", unmatched: "secondary", discrepancy: "destructive",
};

export default function Transactions() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [runFilter, setRunFilter] = useState(searchParams.get("runId") || "all");

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    if (val === "all") searchParams.delete("status");
    else searchParams.set("status", val);
    setSearchParams(searchParams);
  };

  const handleRunChange = (val: string) => {
    setRunFilter(val);
    if (val === "all") searchParams.delete("runId");
    else searchParams.set("runId", val);
    setSearchParams(searchParams);
  };

  const batchId = searchParams.get("batchId");

  const fetchTransactions = () => {
    if (!user) return;
    const batchIdArr = batchId ? batchId.split(',') : undefined;
    api.getTransactions({ 
      source: sourceFilter, 
      status: statusFilter, 
      batchId: batchIdArr,
      runId: runFilter === 'all' ? undefined : runFilter
    })
      .then(setTransactions)
      .catch(() => { });
  };

  useEffect(() => {
    if (!user) return;
    api.getReconciliationRuns().then(setRuns).catch(() => {});
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [user, sourceFilter, statusFilter, batchId, runFilter]);

  const handlePurge = async () => {
    if (!window.confirm("This will permanently delete ALL imported transactions and reconciliation history. Continue?")) return;
    try {
      await api.purgeData();
      fetchTransactions();
      toast({ title: "System reset", description: "All data has been cleared." });
    } catch (err: unknown) {
      toast({ title: "Clear failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setSearchParams({});
    setSourceFilter("all");
    setStatusFilter("all");
    setRunFilter("all");
    setSearch("");
  };

  const filtered = transactions.filter(
    (t) =>
      !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
      t.amount.toString().includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">View and filter all imported transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {batchId && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <RotateCcw className="mr-2 h-4 w-4" /> Clear Filter
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePurge} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" /> Reset All Data
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-1 items-center gap-4 w-full md:max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description or reference..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0"><RotateCcw className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="hidden xl:block text-xs uppercase text-muted-foreground font-semibold">Source:</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="bank_statement">Bank</SelectItem>
                  <SelectItem value="payment_gateway">Gateway</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="hidden xl:block text-xs uppercase text-muted-foreground font-semibold">Run:</Label>
              <Select value={runFilter} onValueChange={handleRunChange}>
                <SelectTrigger className="w-[180px] sm:w-[240px]">
                  <SelectValue placeholder="All History" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Full History</SelectItem>
                  {runs.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium">{safeDate(r.createdAt)}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {r.sourceA.split('_')[0]} + {r.sourceB.split('_')[0]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="hidden xl:block text-xs uppercase text-muted-foreground font-semibold">Status:</Label>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="discrepancy">Discrepancy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="text-sm">{safeDate(t.transactionDate)}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs">{sourceLabels[t.source] || t.source}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.referenceId || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{t.description || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{t.currency} {t.amount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusVariant[t.status] || "secondary"}>{t.status}</Badge></TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No transactions found. Upload data to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
