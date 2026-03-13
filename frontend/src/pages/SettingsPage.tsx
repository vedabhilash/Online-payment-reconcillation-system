import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [dateTolerance, setDateTolerance] = useState(3);
  const [amountTolerance, setAmountTolerance] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getSettings().then((s) => {
      if (s.dateTolerance !== undefined) setDateTolerance(s.dateTolerance);
      if (s.amountTolerance !== undefined) setAmountTolerance(s.amountTolerance);
      if (s.defaultCurrency) setCurrency(s.defaultCurrency);
    }).catch(() => { });
    setDisplayName(user.displayName || "");
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.saveSettings({ dateTolerance, amountTolerance, defaultCurrency: currency, displayName });
      toast({ title: "Settings saved" });
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your reconciliation preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matching Rules</CardTitle>
          <CardDescription>Default settings for auto-reconciliation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Date Tolerance (days)</Label>
            <Input type="number" min={0} max={30} value={dateTolerance} onChange={(e) => setDateTolerance(parseInt(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground">Transactions within ±{dateTolerance} days will be considered for matching</p>
          </div>
          <div className="space-y-2">
            <Label>Amount Tolerance</Label>
            <Input type="number" min={0} step={0.01} value={amountTolerance} onChange={(e) => setAmountTolerance(parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground">Maximum difference in amount to still match</p>
          </div>
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                <SelectItem value="JPY">JPY (Japanese Yen)</SelectItem>
                <SelectItem value="CAD">CAD (Canadian Dollar)</SelectItem>
                <SelectItem value="AUD">AUD (Australian Dollar)</SelectItem>
                <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Standard currency for newly created invoices and reports</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
