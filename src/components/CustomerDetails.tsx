import { format } from "date-fns";
import {
    IndianRupee,
    Phone,
    Mail,
    MapPin,
    Edit,
    Trash2,
    History,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/csv";
import type { Customer, Sale, Receipt } from "@/types";

interface CustomerDetailsProps {
    customer: Customer | null;
    open: boolean;
    onClose: () => void;
    onEdit: (c: Customer) => void;
    onDelete: (c: Customer) => void;
    onReceive: (c: Customer) => void;
    sales: Sale[];
    receipts: Receipt[];
}

export function CustomerDetails({
    customer,
    open,
    onClose,
    onEdit,
    onDelete,
    onReceive,
    sales,
    receipts
}: CustomerDetailsProps) {
    if (!customer) return null;

    // Calculate pending amount
    const customerSales = sales.filter(s => s.customer_name === customer.name);
    const customerReceipts = receipts.filter(r => r.customer_name === customer.name);

    const totalSales = customerSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalReceipts = customerReceipts.reduce((sum, r) => sum + r.amount, 0);
    const pendingAmount = (totalSales + (customer.opening_balance || 0)) - totalReceipts;

    // Combine history
    const history = [
        ...customerSales.map(s => ({ ...s, type: 'sale' as const })),
        ...customerReceipts.map(r => ({ ...r, type: 'receipt' as const }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex justify-between items-start">
                        {customer.name}
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => { onClose(); onEdit(customer); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { onClose(); onDelete(customer); }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogTitle>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                        </div>
                        {customer.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{customer.email}</span>
                            </div>
                        )}
                        {customer.address && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[250px]">{customer.address}</span>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="px-6 py-4 bg-muted/30 border-y">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Pending Amount</span>
                        <span className={`text-2xl font-bold ${pendingAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatINR(pendingAmount)}
                        </span>
                    </div>
                    <Button className="w-full mt-4 gap-2" size="lg" onClick={() => { onClose(); onReceive(customer); }}>
                        <IndianRupee className="h-4 w-4" /> Receive Payment
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="px-6 py-2 bg-background border-b flex items-center gap-2 font-medium">
                        <History className="h-4 w-4 text-muted-foreground" />
                        Transaction History
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-6 pt-2 space-y-4">
                            {history.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-8">No transactions found</p>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${item.type === 'sale' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.type === 'sale' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {item.type === 'sale' ? 'Sale' : 'Payment Received'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-medium ${item.type === 'sale' ? 'text-foreground' : 'text-green-600'}`}>
                                                {item.type === 'sale' ? '+' : '-'}{formatINR('total_amount' in item ? item.total_amount : item.amount)}
                                            </p>
                                            {'bill_number' in item && item.bill_number && (
                                                <p className="text-xs text-muted-foreground">Bill #: {item.bill_number}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="md:hidden p-4 border-t">
                    <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
