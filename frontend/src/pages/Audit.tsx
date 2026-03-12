import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface AuditLog {
  _id: string; action: string; entityType: string; entityId: string | null;
  details: Record<string, unknown>; createdAt: string;
}

export default function Audit() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    api.getAuditLogs().then(setLogs).catch(() => { });
  }, [user]);

  const filtered = logs.filter(
    (l) => !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entityType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Log of all reconciliation actions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search actions…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead><TableHead>Action</TableHead>
                <TableHead>Entity</TableHead><TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((l) => (
                <TableRow key={l._id}>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{l.action.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{l.entityType.replace("_", " ")}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">{JSON.stringify(l.details)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">No audit logs yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
