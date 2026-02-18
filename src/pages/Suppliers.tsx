import { useState } from "react";
import { Plus, Download, Upload, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SupplierForm } from "@/components/SupplierForm";
import { PaymentForm } from "@/components/PaymentForm";
import { SupplierDetails } from "@/components/SupplierDetails";
import { useSupabase } from "@/hooks/useSupabase";
import { exportToCSV, parseCSV, importCSVFile, formatINR } from "@/lib/csv";
import type { Supplier, Purchase, Payment } from "@/types";

export default function Suppliers() {
    const { data: suppliers, loading: loadingSuppliers, add: addSupplier, update: updateSupplier, remove: removeSupplier } = useSupabase<Supplier>("suppliers");
    const { data: purchases } = useSupabase<Purchase>("purchases");
    const { data: payments, add: addPayment } = useSupabase<Payment>("payments");

    const [formOpen, setFormOpen] = useState(false);
    const [paymentFormOpen, setPaymentFormOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const [editing, setEditing] = useState<Supplier | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const totalPayable = (() => {
        const totalOpening = suppliers.reduce((sum, s) => sum + (s.opening_balance || 0), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        return totalOpening + totalPurchases - totalPayments;
    })();

    const handleSave = async (s: Supplier) => {
        if (editing) {
            await updateSupplier(s.id, {
                name: s.name,
                phone: s.phone,
                email: s.email,
                address: s.address,
                opening_balance: s.opening_balance
            });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...rest } = s;
            await addSupplier(rest);
        }
    };

    const handleSavePayment = async (p: Payment) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = p;
        await addPayment({
            ...rest,
            supplier_name: selectedSupplier ? selectedSupplier.name : rest.supplier_name
        });
    };

    const handleDelete = async (s: Supplier) => {
        if (confirm("Delete this supplier?")) {
            await removeSupplier(s.id);
        }
    };

    const handleExport = () => {
        exportToCSV(suppliers, "suppliers", [
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            { key: "opening_balance", label: "Opening Bal" },
            { key: "address", label: "Address" },
        ]);
    };

    const handleImport = () => {
        importCSVFile((text) => {
            const imported = parseCSV(text, (row) => ({
                id: "temp",
                name: row["Name"] || "",
                phone: row["Phone"] || "",
                email: row["Email"] || "",
                opening_balance: parseFloat(row["Opening Bal"]) || 0,
                address: row["Address"] || undefined,
            }));

            imported.forEach(async (s) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...rest } = s;
                await addSupplier(rest);
            });
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

    const columns = [
        { key: "name", label: "Name", sortable: true, className: "max-w-[150px] truncate" },
        { key: "phone", label: "Phone", className: "hidden sm:table-cell" },
        { key: "email", label: "Email", className: "hidden md:table-cell" },
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
    ];

    if (loadingSuppliers) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
                            <Upload className="h-4 w-4" /> Import CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={suppliers.length === 0}>
                            <Download className="h-4 w-4" /> Export CSV
                        </Button>
                        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
                            <Plus className="h-4 w-4" /> Add Supplier
                        </Button>
                    </div>
                </div>
                <div className="bg-card border rounded-lg p-4 flex justify-between items-center shadow-sm">
                    <span className="text-sm font-medium text-muted-foreground">Total Payable (Outstanding)</span>
                    <span className="text-2xl font-bold text-destructive">{formatINR(totalPayable)}</span>
                </div>
            </div>
            <DataTable
                data={suppliers}
                columns={columns}
                searchPlaceholder="Search suppliers..."
                searchKey="name"
                onEdit={(s) => { setEditing(s); setFormOpen(true); }}
                onDelete={handleDelete}
                onRowClick={(s) => {
                    setSelectedSupplier(s);
                    setDetailsOpen(true);
                }}
            />
            <SupplierForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                initial={editing}
            />
            <PaymentForm
                open={paymentFormOpen}
                onClose={() => { setPaymentFormOpen(false); setSelectedSupplier(null); }}
                onSave={handleSavePayment}
                suppliers={suppliers}
                defaultSupplier={selectedSupplier?.name}
            />
            <SupplierDetails
                open={detailsOpen}
                onClose={() => { setDetailsOpen(false); setSelectedSupplier(null); }}
                supplier={selectedSupplier}
                onEdit={(s) => { setEditing(s); setFormOpen(true); }}
                onDelete={handleDelete}
                onPay={(s) => { setSelectedSupplier(s); setPaymentFormOpen(true); }}
                purchases={purchases}
                payments={payments}
            />
        </div>
    );
}
