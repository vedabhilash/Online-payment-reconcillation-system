import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { safeDate } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface MatchRow {
  id: string; confidence: number; match_type: string; status: string; notes: string | null;
  transaction_a: { id: string; source: string; amount: number; transaction_date: string; description: string | null; reference_id: string | null };
  transaction_b: { id: string; source: string; amount: number; transaction_date: string; description: string | null; reference_id: string | null };
}

export default function Review() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const fetchMatches = async () => {
    if (!user) return;
    try {
      const data = await api.getMatches();
      setMatches(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchMatches(); }, [user]);

  const handleAction = async (matchId: string, action: "approved" | "rejected") => {
    try {
      await api.updateMatch(matchId, action, noteInput[matchId]);
      toast({ title: action === "approved" ? "Match approved" : "Match rejected" });
      fetchMatches();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const bulkApprove = async () => {
    try {
      const { approved } = await api.bulkApprove();
      toast({ title: "All matches approved", description: `${approved} matches approved.` });
      fetchMatches();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Review Matches</h1>
          <p className="text-sm text-muted-foreground">Approve, reject, or annotate matched transactions</p>
        </div>
        {matches.length > 0 && (
          <Button onClick={bulkApprove}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve All ({matches.length})
          </Button>
        )}
      </div>

      {matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant={(Number(m.confidence) || 0) >= 80 ? "default" : "secondary"}>{(Number(m.confidence) || 0).toFixed(0)}% confidence</Badge>
                  <Badge variant="outline">{m.match_type}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[m.transaction_a, m.transaction_b].map((tx, i) => tx && (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{tx.source.replace("_", " ")}</Badge>
                        <span className="font-mono text-sm font-semibold">${(Number(tx.amount) || 0).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{safeDate(tx.transaction_date)}</p>
                      <p className="mt-1 text-sm truncate">{tx.description || tx.reference_id || "—"}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Textarea
                    placeholder="Add notes…"
                    value={noteInput[m.id] || ""}
                    onChange={(e) => setNoteInput((n) => ({ ...n, [m.id]: e.target.value }))}
                    className="h-9 min-h-0 flex-1 resize-none text-sm"
                  />
                  <Button size="sm" onClick={() => handleAction(m.id, "approved")}><CheckCircle2 className="mr-1 h-3 w-3" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(m.id, "rejected")}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No pending matches to review. Run a reconciliation first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
