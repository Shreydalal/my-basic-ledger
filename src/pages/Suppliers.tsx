import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { Plus, Download, IndianRupee, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SupplierForm } from "@/components/SupplierForm";
import { PaymentForm } from "@/components/PaymentForm";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Supplier, Purchase, Payment } from "@/types";

export default function Suppliers() {
    const navigate = useNavigate();
    const { data: suppliers, loading: loadingSuppliers, add: addSupplier } = useSupabase<Supplier>("suppliers");
    const { data: purchases } = useSupabase<Purchase>("purchases");
    const { data: payments, add: addPayment } = useSupabase<Payment>("payments");

    const [formOpen, setFormOpen] = useState(false);
    const [paymentFormOpen, setPaymentFormOpen] = useState(false);

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Live "time since" updates
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const totalPayable = (() => {
        const totalOpening = suppliers.reduce((sum, s) => sum + (s.opening_balance || 0), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        return totalOpening + totalPurchases - totalPayments;
    })();

    const handleSave = async (s: Supplier) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = s;
        await addSupplier(rest);
    };

    const handleSavePayment = async (p: Payment) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = p;
        await addPayment({
            ...rest,
            supplier_name: selectedSupplier ? selectedSupplier.name : rest.supplier_name
        });
    };

    const handleExport = () => {
        const exportData = suppliers.map(s => ({
            name: s.name,
            opening_balance: formatINR(s.opening_balance || 0),
            current_balance: formatINR(getPendingAmount(s.name)),
            phone: s.phone || "—",
            email: s.email || "—"
        }));

        exportToPDF({
            title: "Navkar Enterprise - Suppliers",
            subtitle: "A complete list of registered suppliers and balances.",
            filename: "suppliers_report",
            data: exportData,
            columns: [
                { key: "name", label: "Name" },
                { key: "opening_balance", label: "Opening Balance" },
                { key: "current_balance", label: "Current Balance" },
                { key: "phone", label: "Phone" },
                { key: "email", label: "Email" }
            ],
            metrics: [
                { label: "Total Outstanding", value: formatINR(totalPayable) },
                { label: "Total Suppliers", value: suppliers.length.toString() }
            ]
        });
    };

    const getPendingAmount = (supplierName: string) => {
        const supplier = suppliers.find(s => s.name === supplierName);
        const openingBalance = supplier?.opening_balance || 0;

        const totalPurchases = purchases
            .filter((p) => p.supplier_name === supplierName)
            .reduce((sum, p) => sum + p.total_amount, 0);

        const totalPayments = payments
            .filter((p) => p.supplier_name === supplierName)
            .reduce((sum, p) => sum + p.amount, 0);

        return (totalPurchases + openingBalance) - totalPayments;
    };

    const columns = useMemo(() => [
        {
            key: "name",
            label: "Name",
            sortable: true,
            className: "max-w-[140px]",
            render: (s: Supplier) => {
                const supplierPayments = payments.filter(p => p.supplier_name === s.name);
                const dates = supplierPayments.map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));

                const lastPaymentDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

                return (
                    <div className="flex flex-col py-0.5">
                        <span className="font-medium truncate text-sm sm:text-base">{s.name}</span>
                        {lastPaymentDate && (
                            <span className="text-[10px] text-muted-foreground sm:hidden flex items-center gap-0.5">
                                <History className="h-2 w-2" />
                                {formatDistanceToNowStrict(lastPaymentDate, { addSuffix: true })}
                            </span>
                        )}
                    </div>
                );
            }
        },
        { key: "phone", label: "Phone", className: "hidden sm:table-cell" },
        {
            key: "last_payment",
            label: "Last Payment",
            className: "hidden sm:table-cell whitespace-nowrap",
            render: (s: Supplier) => {
                // tie to `now` for live refresh
                void now;
                const supplierPayments = payments.filter(p => p.supplier_name === s.name);
                const dates = supplierPayments.map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));

                if (dates.length === 0) return "—";
                const lastDate = new Date(Math.max(...dates));
                return formatDistanceToNowStrict(lastDate, { addSuffix: true });
            }
        },
        { key: "address", label: "Address", className: "hidden md:table-cell", render: (s: Supplier) => s.address || "—" },
        {
            key: "pending",
            label: "Pending",
            className: "text-right whitespace-nowrap",
            render: (s: Supplier) => <span className="font-medium">{formatINR(getPendingAmount(s.name))}</span>
        },
        {
            key: "actions",
            label: "Actions",
            className: "hidden md:table-cell",
            render: (s: Supplier) => (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplier(s);
                        setPaymentFormOpen(true);
                    }}
                >
                    <IndianRupee className="h-3.5 w-3.5" /> Pay
                </Button>
            )
        }
    ], [now, purchases, payments, suppliers]);

    if (loadingSuppliers) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Suppliers</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Manage vendors, balances, and payment history.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5" disabled={suppliers.length === 0}>
                        <Download className="h-4 w-4" /> Export Report
                    </Button>
                    <Button onClick={() => setFormOpen(true)} className="gap-1.5 gradient-btn text-white">
                        <Plus className="h-4 w-4 text-white" /> Add Supplier
                    </Button>
                </div>
            </div>
            
            <div className="mb-8 p-6 rounded-xl overflow-hidden relative soft-inset bg-card shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="z-10 w-full sm:w-auto mb-2 sm:mb-0">
                    <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-muted-foreground break-words">Total Payable (Outstanding)</span>
                </div>
                <div className="z-10 w-full sm:w-auto">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-warning break-words">{formatINR(totalPayable)}</span>
                </div>
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-warning/5 to-transparent pointer-events-none" />
            </div>
            <DataTable
                data={suppliers}
                columns={columns}
                searchPlaceholder="Search suppliers..."
                searchKey="name"
                onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
            />
            <SupplierForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
            />
            <PaymentForm
                open={paymentFormOpen}
                onClose={() => { setPaymentFormOpen(false); setSelectedSupplier(null); }}
                onSave={handleSavePayment}
                suppliers={suppliers}
                defaultSupplier={selectedSupplier?.name}
                purchases={purchases}
            />
        </div>
    );
}
