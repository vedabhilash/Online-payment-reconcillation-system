import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";

export default function CustomerInvoices() {
    const { data: invoices, isLoading, refetch } = useQuery({
        queryKey: ["customerInvoices"],
        queryFn: async () => {
            const res = await api.getCustomerInvoices();
            return res;
        },
    });

    useEffect(() => {
        const verifyPayment = async () => {
            const params = new URLSearchParams(window.location.search);
            if (params.get('payment') === 'success') {
                const invoiceId = params.get('invoiceId');
                const sessionId = params.get('session_id');

                if (invoiceId && sessionId) {
                    try {
                        await api.verifyPayment(sessionId, invoiceId);
                        toast({ title: 'Payment Successful', description: 'Your payment was successfully processed.', variant: 'default' });
                        refetch();
                    } catch (err: any) {
                        toast({ title: 'Payment Verification Failed', description: err.message || 'Payment may take a few minutes to reflect.', variant: 'destructive' });
                    }
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (params.get('payment') === 'cancelled') {
                toast({ title: 'Payment Cancelled', description: 'The checkout process was cancelled.', variant: 'destructive' });
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        verifyPayment();
    }, []);

    const [payingId, setPayingId] = useState<string | null>(null);

    const handlePay = async (invoiceId: string) => {
        setPayingId(invoiceId);
        try {
            const { url } = await api.createCheckoutSession(invoiceId);
            if (url) window.location.href = url;
            else toast({ title: "Failed to initiate payment", variant: "destructive" });
        } catch (err: any) {
            toast({ title: "Payment Error", description: err.message, variant: "destructive" });
        } finally {
            setPayingId(null);
        }
    };

    if (isLoading) {
        return <div>Loading your invoices...</div>;
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">My Invoices</h1>
                <p className="text-lg text-muted-foreground">Manage and pay your outstanding balances with ease.</p>
            </div>

            <div className="grid gap-6">
                {invoices?.length === 0 ? (
                    <div className="text-muted-foreground p-20 text-center glass rounded-3xl animate-in fade-in zoom-in duration-500">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 rounded-full bg-muted">
                                <FileText className="h-10 w-10 opacity-20" />
                            </div>
                            <p className="text-xl font-medium">No invoices found</p>
                            <p>You don't have any invoices yet.</p>
                        </div>
                    </div>
                ) : (
                    invoices?.map((inv: any) => (
                        <Card key={inv._id} className="glass border-0 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 rounded-3xl overflow-hidden group">
                            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-xl font-bold">Invoice #{inv.invoiceNumber}</CardTitle>
                                        <Badge 
                                            variant={inv.status === 'Paid' ? 'secondary' : inv.status === 'Overdue' ? 'destructive' : 'outline'}
                                            className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                                        >
                                            {inv.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2 font-medium">
                                        Due on {safeDate(inv.dueDate, 'MMMM dd, yyyy')}
                                    </p>
                                </div>
                                <div className="text-3xl font-black tracking-tight text-primary">
                                    ${(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pt-4 flex items-center justify-between border-t border-black/[0.03] dark:border-white/[0.03] bg-black/[0.01]">
                                <div className="flex gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Issue Date</span>
                                        <span className="text-sm font-semibold">{safeDate(inv.createdAt || inv.issueDate || Date.now())}</span>
                                    </div>
                                </div>
                                {inv.status !== 'Paid' && (
                                    <Button 
                                        onClick={() => handlePay(inv._id)} 
                                        disabled={payingId === inv._id}
                                        className="rounded-2xl px-8 py-6 h-auto text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                                    >
                                        {payingId === inv._id ? (
                                            <span className="flex items-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Processing...
                                            </span>
                                        ) : "Pay Invoice"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
