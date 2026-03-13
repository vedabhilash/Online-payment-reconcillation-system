import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { safeDate } from "@/lib/utils";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface Transaction {
  _id: string; source: string; referenceId: string | null; description: string | null;
  amount: number; currency: string; transactionDate: string; status: string;
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
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    if (val === "all") searchParams.delete("status");
    else searchParams.set("status", val);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    if (!user) return;
    api.getTransactions({ source: sourceFilter, status: statusFilter })
      .then(setTransactions)
      .catch(() => { });
  }, [user, sourceFilter, statusFilter]);

  const filtered = transactions.filter(
    (t) =>
      !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
      t.amount.toString().includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground">View and filter all imported transactions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by description, reference, or amount…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="bank_statement">Bank Statement</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payment_gateway">Payment Gateway</SelectItem>
                <SelectItem value="order">Order</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="discrepancy">Discrepancy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Source</TableHead><TableHead>Reference</TableHead>
                <TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="text-sm">{safeDate(t.transactionDate)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{sourceLabels[t.source] || t.source}</Badge></TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
