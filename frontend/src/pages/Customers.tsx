import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Users, Search } from "lucide-react";

export default function Customers() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        billingAddress: "",
        taxId: "",
    });

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ["customers"],
        queryFn: async () => await api.getCustomers(),
    });

    const createCustomerMutation = useMutation({
        mutationFn: (data: typeof formData) => api.createCustomer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast({ title: "Customer created successfully" });
            setIsAddOpen(false);
            setFormData({ name: "", email: "", phone: "", billingAddress: "", taxId: "" });
        },
        onError: (err: Error) => toast({ title: "Failed to create customer", description: err.message, variant: "destructive" }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createCustomerMutation.mutate(formData);
    };

    const filteredCustomers = customers.filter(
        (c: any) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Customers</h1>
                    <p className="text-lg text-muted-foreground">Manage your client registry and billing profiles.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-2xl px-6 h-14 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                            <Plus className="mr-2 h-5 w-5" /> Add New Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-0 shadow-2xl rounded-[2.5rem] p-8 max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">Register Customer</DialogTitle>
                            <p className="text-muted-foreground text-sm font-medium">Enter details for the new billing profile.</p>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name / Company *</Label>
                                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Apple Inc." className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="billing@company.com" className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 555-0000" className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Tax Identification ID (optional)</Label>
                                <Input value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} placeholder="VAT, EIN, GSTIN" className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Billing Address</Label>
                                <Textarea value={formData.billingAddress} onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })} placeholder="1 Infinite Loop, Cupertino, CA" className="min-h-[100px] rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20 p-4" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={createCustomerMutation.isPending} className="rounded-2xl px-10 h-14 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-200">
                                    {createCustomerMutation.isPending ? "Registering..." : "Create Profile"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 group-focus-within:opacity-100 transition-opacity" />
                    <Input
                        placeholder="Search by name, email or ID..."
                        className="h-14 pl-12 rounded-2xl glass border-0 shadow-sm focus-visible:ring-primary/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : filteredCustomers.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-20 glass border-0 rounded-[2.5rem] shadow-xl text-center">
                    <div className="p-6 rounded-full bg-muted/50 mb-6 font-display">
                        <Users className="h-16 w-16 text-muted-foreground/20" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">{searchTerm ? "No matches found" : "Registry is empty"}</h3>
                    <p className="text-muted-foreground font-medium max-w-sm">
                        {searchTerm ? `We couldn't find any customers matching "${searchTerm}" in your records.` : "Register your first customer to begin your automated billing journey with ReconPay."}
                    </p>
                </Card>
            ) : (
                <Card className="glass border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/[0.05] dark:border-white/[0.05] bg-black/[0.02] dark:bg-white/[0.02]">
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Customer Identity</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Contact</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">Tax Identifier</th>
                                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60 text-right">Registration Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                                {filteredCustomers.map((customer: any) => (
                                    <tr key={customer._id} className="group hover:bg-primary/[0.01] transition-colors duration-200">
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{customer.name}</div>
                                            <div className="text-muted-foreground text-[11px] font-bold uppercase tracking-tight mt-0.5">{customer.email || 'No email associated'}</div>
                                        </td>
                                        <td className="px-8 py-6 font-semibold text-sm text-foreground/80">{customer.phone || '—'}</td>
                                        <td className="px-8 py-6">
                                            <Badge variant="outline" className="rounded-lg font-bold px-3 py-1 bg-black/[0.02] border-black/[0.05] dark:border-white/[0.05] uppercase text-[10px]">
                                                {customer.taxId || 'Not Specified'}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="text-sm font-bold text-foreground/70">{format(new Date(customer.createdAt), 'MMM dd, yyyy')}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
