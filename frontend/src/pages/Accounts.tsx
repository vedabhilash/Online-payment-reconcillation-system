import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast";

interface Account {
    _id: string;
    accountName: string;
    accountType: string;
    balance: number;
    currency: string;
}

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);
    } catch (e) {
        return `$${(Number(amount) || 0).toFixed(2)}`;
    }
};

export default function Accounts() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [open, setOpen] = useState(false);

    // Form state
    const [accountName, setAccountName] = useState("");
    const [accountType, setAccountType] = useState("");

    const loadAccounts = () => {
        if (!user) return;
        api.getAccounts().then(setAccounts).catch(() => { });
    };

    useEffect(() => {
        loadAccounts();
    }, [user]);

    const handleCreateAccount = async () => {
        try {
            await api.createAccount({ accountName, accountType, currency: 'USD' });
            toast({ title: 'Success', description: 'Account created successfully.' });
            setOpen(false);
            loadAccounts();
            // Reset form
            setAccountName('');
            setAccountType('');
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to create account', variant: 'destructive' });
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Asset': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'Liability': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'Equity': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
            case 'Expense': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            default: return '';
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold">Chart of Accounts</h1>
                    <p className="text-sm text-muted-foreground">Manage your general ledger and track category balances.</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> New Account</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Account</DialogTitle>
                            <DialogDescription>Add a new ledger category to your chart of accounts.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Account Name</Label>
                                <Input placeholder="e.g. Travel Expenses" value={accountName} onChange={e => setAccountName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Account Type</Label>
                                <Select value={accountType} onValueChange={setAccountType}>
                                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Asset">Asset</SelectItem>
                                        <SelectItem value="Liability">Liability</SelectItem>
                                        <SelectItem value="Equity">Equity</SelectItem>
                                        <SelectItem value="Expense">Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full" onClick={handleCreateAccount} disabled={!accountName || !accountType}>Save Account</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-primary" /> General Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map(acc => (
                                <TableRow key={acc._id}>
                                    <TableCell className="font-medium">
                                        {acc.accountName}
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className={getTypeColor(acc.accountType)}>{acc.accountType}</Badge></TableCell>
                                    <TableCell className="text-right font-mono font-medium">{formatCurrency(acc.balance, acc.currency)}</TableCell>
                                </TableRow>
                            ))}
                            {accounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading accounts...</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
