import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { DollarSign, FileText, CheckCircle2, CopyMinus } from "lucide-react";

export default function CustomerDashboard() {
    const navigate = useNavigate();
    const { data: stats, isLoading } = useQuery({
        queryKey: ["customerDashboardStats"],
        queryFn: async () => {
            return await api.getCustomerDashboardStats();
        },
    });

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const summaryCards = [
        { label: "Outstanding Balance", value: `$${stats?.outstandingBalance?.toFixed(2) || '0.00'}`, icon: DollarSign, color: "text-primary" },
        { label: "Total Invoices", value: stats?.totalInvoices || 0, icon: FileText, color: "text-muted-foreground" },
        { label: "Paid", value: stats?.paidInvoices || 0, icon: CheckCircle2, color: "text-success" },
        { label: "Pending", value: stats?.pendingInvoices || 0, icon: CopyMinus, color: "text-warning" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Welcome Back!</h1>
                <p className="text-sm text-muted-foreground">Here's your billing and payment summary.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map(({ label, value, icon: Icon, color }) => (
                    <Card key={label}>
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className={`rounded-lg bg-muted p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                            <div>
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="font-display text-2xl font-bold">{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
                        <Button variant="link" size="sm" onClick={() => navigate("/customer/invoices")}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {stats?.recentInvoices?.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                                No recent invoices to display.
                            </div>
                        ) : (
                            <div className="space-y-4 pt-2">
                                {stats?.recentInvoices?.map((inv: any) => (
                                    <div key={inv._id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm">Invoice #{inv.invoiceNumber}</p>
                                            <p className="text-xs text-muted-foreground">Due: {format(new Date(inv.dueDate), 'MMM dd, yyyy')}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium">${inv.totalAmount.toFixed(2)}</span>
                                            <Badge variant={inv.status === 'Paid' ? 'secondary' : inv.status === 'Overdue' ? 'destructive' : 'outline'}>
                                                {inv.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20 flex flex-col items-center justify-center p-6 text-center shadow-none">
                    <DollarSign className="h-12 w-12 text-primary mb-4 opacity-80" />
                    <h3 className="text-xl font-bold mb-2">Ready to Pay?</h3>
                    <p className="text-sm text-muted-foreground mb-6">You have an outstanding balance of ${stats?.outstandingBalance?.toFixed(2) || '0.00'}. Pay your invoices quickly and securely via our payment gateway.</p>
                    <Button className="w-full" onClick={() => navigate("/customer/invoices")}>
                        Make a Payment
                    </Button>
                </Card>
            </div>
        </div>
    );
}
