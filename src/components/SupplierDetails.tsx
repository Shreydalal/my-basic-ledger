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
import type { Supplier, Purchase, Payment } from "@/types";

interface SupplierDetailsProps {
    supplier: Supplier | null;
    open: boolean;
    onClose: () => void;
    onEdit: (s: Supplier) => void;
    onDelete: (s: Supplier) => void;
    onPay: (s: Supplier) => void;
    purchases: Purchase[];
    payments: Payment[];
}

export function SupplierDetails({
    supplier,
    open,
    onClose,
    onEdit,
    onDelete,
    onPay,
    purchases,
    payments
}: SupplierDetailsProps) {
    if (!supplier) return null;

    // Calculate pending amount
    const supplierPurchases = purchases.filter(p => p.supplier_name === supplier.name);
    const supplierPayments = payments.filter(p => p.supplier_name === supplier.name);

    const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.total_amount, 0);
    const totalPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = (totalPurchases + (supplier.opening_balance || 0)) - totalPayments;

    // Combine history
    const history = [
        ...supplierPurchases.map(p => ({ ...p, type: 'purchase' as const })),
        ...supplierPayments.map(p => ({ ...p, type: 'payment' as const }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex justify-between items-start">
                        {supplier.name}
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => { onClose(); onEdit(supplier); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { onClose(); onDelete(supplier); }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogTitle>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                        </div>
                        {supplier.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{supplier.email}</span>
                            </div>
                        )}
                        {supplier.address && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[250px]">{supplier.address}</span>
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
                    <Button className="w-full mt-4 gap-2" size="lg" onClick={() => { onClose(); onPay(supplier); }}>
                        <IndianRupee className="h-4 w-4" /> Make Payment
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
                                            <div className={`p-2 rounded-full ${item.type === 'purchase' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.type === 'purchase' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {item.type === 'purchase' ? 'Purchase' : 'Payment Made'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-medium ${item.type === 'purchase' ? 'text-foreground' : 'text-green-600'}`}>
                                                {item.type === 'purchase' ? '+' : '-'}{formatINR('total_amount' in item ? item.total_amount : item.amount)}
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
