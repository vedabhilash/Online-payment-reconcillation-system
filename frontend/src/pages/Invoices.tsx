import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FileText, Plus, Users, CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";

interface Invoice {
    _id: string;
    invoiceNumber: string;
    customerId: { _id: string, name: string };
    issueDate: string;
    dueDate: string;
    status: string;
    totalAmount: number;
}
export default function Invoices() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const loadInvoices = () => {
        api.getInvoices().then(setInvoices).catch(() => { });
    };

    useEffect(() => {
        if (!user) return;
        loadInvoices();

        // Handle Stripe success redirect
        const verifyPayment = async () => {
            const params = new URLSearchParams(window.location.search);
            if (params.get('payment') === 'success') {
                const invoiceId = params.get('invoiceId');
                const sessionId = params.get('session_id');

                if (invoiceId && sessionId) {
                    try {
                        await api.verifyPayment(sessionId, invoiceId);
                        toast({ title: 'Payment Successful', description: 'The invoice has been verified as paid.', variant: 'default' });
                        loadInvoices();
                    } catch (err: any) {
                        toast({ title: 'Payment Verification Failed', description: err.message, variant: 'destructive' });
                    }
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (params.get('payment') === 'cancelled') {
                toast({ title: 'Payment Cancelled', description: 'The checkout process was cancelled.', variant: 'destructive' });
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        verifyPayment();
    }, [user]);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Draft': return 'secondary';
            case 'Sent': return 'default';
            case 'Paid': return 'success';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Invoices & AR</h1>
                    <p className="text-lg text-muted-foreground">Manage your accounts receivable and automated billing flows.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="rounded-2xl px-6 h-14 text-base font-bold bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300" onClick={() => navigate("/customers")}>
                        <Users className="mr-2 h-5 w-5" /> Customers
                    </Button>
                    <Button className="rounded-2xl px-6 h-14 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-5 w-5" /> Create Invoice
                    </Button>
                </div>
            </div>

            <Card className="glass border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        Active Invoices
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-medium ml-12">Track and manage outstanding customer payments.</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-black/[0.05] dark:border-white/[0.05] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-transparent">
                                    <TableHead className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Invoice ID</TableHead>
                                    <TableHead className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Customer</TableHead>
                                    <TableHead className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Issue Date</TableHead>
                                    <TableHead className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Due Date</TableHead>
                                    <TableHead className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Status</TableHead>
                                    <TableHead className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60 text-right">Amount Due</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.length > 0 ? invoices.map(inv => (
                                    <TableRow key={inv._id} className="group hover:bg-primary/[0.01] transition-colors duration-200 border-b border-black/[0.03] dark:border-white/[0.03]">
                                        <TableCell className="px-8 py-6 font-mono text-sm font-bold text-muted-foreground tracking-tighter">#{inv.invoiceNumber}</TableCell>
                                        <TableCell className="px-8 py-6">
                                            <div className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{inv.customerId?.name || 'Unknown'}</div>
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer ID: {inv.customerId?._id?.slice(-6) || 'N/A'}</div>
                                        </TableCell>
                                        <TableCell className="px-8 py-6 font-semibold text-sm text-foreground/70">{format(new Date(inv.issueDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="px-8 py-6 font-semibold text-sm text-foreground/70">{format(new Date(inv.dueDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="px-8 py-6">
                                            <Badge variant={getStatusVariant(inv.status) as any} className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-8 py-6 text-right">
                                            <div className="font-black text-lg tracking-tight text-foreground">${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={6} className="text-center py-24">
                                            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                <div className="p-6 rounded-full bg-muted/50">
                                                    <CreditCard className="h-12 w-12 opacity-20" />
                                                </div>
                                                <h3 className="text-xl font-black">No invoices issued</h3>
                                                <p className="max-w-xs text-sm font-medium">Get started by creating your first invoice for a registered customer.</p>
                                                <Button className="mt-4 rounded-xl font-bold px-8 shadow-lg shadow-primary/20" onClick={() => setIsCreateOpen(true)}>Create First Invoice</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <CreateInvoiceDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={loadInvoices}
            />
        </div>
    )
}
