import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Customer {
    _id: string;
    name: string;
}

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

export function CreateInvoiceDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const [customerId, setCustomerId] = useState("");
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerEmail, setNewCustomerEmail] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(Math.random() * 10000)}`);
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const [lines, setLines] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

    useEffect(() => {
        if (open) {
            fetchCustomers();
            setInvoiceNumber(`INV-${Math.floor(Math.random() * 10000)}`); // reset
            setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
            setCustomerId("");
            setNewCustomerName("");
            setNewCustomerEmail("");
        }
    }, [open]);

    const fetchCustomers = async () => {
        try {
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddLine = () => {
        setLines([...lines, { description: "", quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleLineChange = (index: number, field: keyof LineItem, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalCustomerId = customerId;

            // Simple "Create New Customer on the fly"
            if ((!customerId || customerId === "new") && newCustomerName) {
                if (!newCustomerEmail) {
                    toast({ title: "Email Required", description: "You must provide an email so the customer can log in to pay.", variant: "destructive" });
                    setLoading(false);
                    return;
                }
                const newCustomer = await api.createCustomer({ name: newCustomerName, email: newCustomerEmail });
                finalCustomerId = newCustomer._id;
            } else if (customerId === "new") {
                finalCustomerId = ""; // Reset to trigger error below if name was empty
            }

            if (!finalCustomerId) {
                toast({ title: "Error", description: "Please select or create a customer.", variant: "destructive" });
                setLoading(false);
                return;
            }

            if (lines.some(l => !l.description || l.quantity <= 0 || l.unitPrice < 0)) {
                toast({ title: "Error", description: "Please ensure all line items are valid.", variant: "destructive" });
                setLoading(false);
                return;
            }

            const payload = {
                customerId: finalCustomerId,
                invoiceNumber,
                issueDate,
                dueDate,
                status: "Sent",
                lines: lines.map(l => ({ ...l, taxRate: 0 })) // 0% tax for simplicity right now
            };

            await api.createInvoice(payload);
            toast({ title: "Success", description: "Invoice created successfully." });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to create invoice", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const subtotal = lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select or create new..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new" className="font-semibold text-primary">+ Create New Customer</SelectItem>
                                    {customers.map(c => (
                                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {!customerId || customerId === "new" || customers.length === 0 ? (
                                <div className="space-y-3 mt-4 p-3 border rounded bg-muted/20">
                                    <div className="space-y-2">
                                        <Label className="text-xs">New Customer Name</Label>
                                        <Input
                                            placeholder="John Doe"
                                            value={newCustomerName}
                                            onChange={e => setNewCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Customer Email (Required for login)</Label>
                                        <Input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={newCustomerEmail}
                                            onChange={e => setNewCustomerEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label>Invoice Number</Label>
                            <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Issue Date</Label>
                            <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-semibold">Line Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddLine}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
                        </div>

                        <div className="space-y-2">
                            {lines.map((line, index) => (
                                <div key={index} className="flex gap-2 items-center bg-muted/30 p-2 rounded-md">
                                    <Input
                                        className="flex-1"
                                        placeholder="Description"
                                        value={line.description}
                                        onChange={e => handleLineChange(index, "description", e.target.value)}
                                        required
                                    />
                                    <Input
                                        type="number"
                                        className="w-24 leading-none"
                                        placeholder="Qty"
                                        value={line.quantity}
                                        onChange={e => handleLineChange(index, "quantity", Number(e.target.value))}
                                        min={1} required
                                    />
                                    <Input
                                        type="number"
                                        className="w-32 leading-none"
                                        placeholder="Price ($)"
                                        value={line.unitPrice}
                                        onChange={e => handleLineChange(index, "unitPrice", Number(e.target.value))}
                                        min={0} step="0.01" required
                                    />
                                    <div className="w-24 text-right pr-2 text-sm font-medium">
                                        ${(line.quantity * line.unitPrice).toFixed(2)}
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleRemoveLine(index)} disabled={lines.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end border-t pt-4">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground mr-6">Subtotal</p>
                            <p className="text-2xl font-bold mr-6">${subtotal.toFixed(2)}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create & Send Invoice
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
