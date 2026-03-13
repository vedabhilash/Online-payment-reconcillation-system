import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { safeDate } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Search, Clock, ShieldAlert, BadgeCheck, XCircle } from "lucide-react";

interface Exception {
  _id: string;
  type: string;
  difference?: number;
  status: string;
  notes?: string;
  createdAt: string;
  bankTransactionId?: { referenceId: string; amount: number; description: string };
  gatewayTransactionId?: { referenceId: string; amount: number; description: string };
}

export default function ExceptionsPage() {
  const { user } = useAuth();
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");

  const fetchData = async () => {
    if (!user) return;
    try {
      const [list, statsData] = await Promise.all([
        api.getExceptions(),
        api.getExceptionStats()
      ]);
      setExceptions(list);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpdate = async () => {
    if (!selectedException) return;
    try {
      await api.updateException(selectedException._id, {
        status: updateStatus,
        notes: updateNotes
      });
      toast({ title: "Exception updated", description: "The status and notes have been saved." });
      setSelectedException(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="destructive" className="animate-pulse">Open</Badge>;
      case "investigating": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Investigating</Badge>;
      case "resolved": return <Badge variant="default" className="bg-success/10 text-success hover:bg-success/20">Resolved</Badge>;
      case "ignored": return <Badge variant="outline">Ignored</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Exception Management</h1>
        <p className="text-muted-foreground">Track and resolve financial discrepancies found during reconciliation.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open", value: stats?.open || 0, icon: ShieldAlert, color: "text-destructive" },
          { label: "Investigating", value: stats?.investigating || 0, icon: Clock, color: "text-blue-500" },
          { label: "Resolved", value: stats?.resolved || 0, icon: BadgeCheck, color: "text-success" },
          { label: "Ignored", value: stats?.ignored || 0, icon: XCircle, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-0 bg-muted/30 shadow-none rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg bg-background shadow-sm ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl font-black">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-xl shadow-black/5 rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/10">
          <CardTitle>Exception Register</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5 hover:bg-muted/5">
                  <TableHead>Date Reported</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bank Reference</TableHead>
                  <TableHead>Gateway Reference</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.length > 0 ? exceptions.map((e) => (
                  <TableRow key={e._id} className="group transition-colors">
                    <TableCell className="text-xs">{safeDate(e.createdAt)}</TableCell>
                    <TableCell>
                      <span className="capitalize text-xs font-semibold">{e.type.replace("_", " ")}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {e.bankTransactionId?.referenceId || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {e.gatewayTransactionId?.referenceId || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-destructive">
                      {e.difference ? `-$${e.difference.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(e.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-full h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setSelectedException(e);
                          setUpdateStatus(e.status);
                          setUpdateNotes(e.notes || "");
                        }}
                      >
                        Investigate
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-success/20" />
                        <p>No open exceptions. All matched or resolved!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedException} onOpenChange={(open) => !open && setSelectedException(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Investigate Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/30 p-4 border border-border/50">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Bank Amount</p>
                <p className="text-sm font-bold">${selectedException?.bankTransactionId?.amount.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Gateway Amount</p>
                <p className="text-sm font-bold">${selectedException?.gatewayTransactionId?.amount.toFixed(2) || "0.00"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Resolution Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Investigation Notes</Label>
              <Textarea 
                placeholder="What did you find?" 
                className="rounded-2xl min-h-[100px]"
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedException(null)} className="rounded-full">Cancel</Button>
            <Button onClick={handleUpdate} className="rounded-full">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
