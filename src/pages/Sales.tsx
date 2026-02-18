import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SaleForm } from "@/components/SaleForm";
import { useSupabase } from "@/hooks/useSupabase";
import { exportToCSV, formatINR } from "@/lib/csv";
import type { Sale, Customer, Receipt } from "@/types";

export default function Sales() {
    const { data: sales, loading: loadingSales, add: addSale, update: updateSale, remove: removeSale } = useSupabase<Sale>("sales");
    const { data: customers } = useSupabase<Customer>("customers");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Sale | null>(null);

    const handleSave = async (s: Sale) => {
        if (editing) {
            await updateSale(s.id, {
                date: s.date,
                customer_name: s.customer_name,
                bill_number: s.bill_number,
                total_amount: s.total_amount,
                notes: s.notes
            });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...rest } = s;
            await addSale(rest);
        }
    };

    const handleDelete = async (s: Sale) => {
        if (confirm("Delete this sale?")) {
            await removeSale(s.id);
        }
    };

    const handleExport = () => {
        const cols = [
            { key: "date", label: "Date" },
            { key: "bill_number", label: "Bill No" },
            { key: "customer_name", label: "Customer" },
            { key: "total_amount", label: "Total Amount" },
            { key: "notes", label: "Notes" },
        ];
        const exportData = sales.map((s) => ({
            ...s,
            date: format(new Date(s.date), "yyyy-MM-dd"),
        }));
        exportToCSV(exportData, "sales", cols);
    };

    const columns = [
        { key: "date", label: "Date", sortable: true, render: (s: Sale) => format(new Date(s.date), "MMM d, yyyy") },
        { key: "bill_number", label: "Bill No", sortable: true },
        { key: "customer_name", label: "Customer", sortable: true },
        { key: "total_amount", label: "Amount", sortable: true, render: (s: Sale) => formatINR(s.total_amount) },
    ];

    if (loadingSales) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <h1 className="text-2xl font-bold text-foreground">Sales</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={sales.length === 0}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                    <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
                        <Plus className="h-4 w-4" /> Add Sale
                    </Button>
                </div>
            </div>
            <DataTable
                data={sales}
                columns={columns}
                searchPlaceholder="Search sales..."
                searchKey="customer_name" // Search by customer name
                onEdit={(s) => { setEditing(s); setFormOpen(true); }}
                onDelete={handleDelete}
            />
            <SaleForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                initial={editing}
                customers={customers}
            />
        </div>
    );
}
