import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Plus, Download, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SaleForm } from "@/components/SaleForm";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Sale, Customer, Receipt } from "@/types";

export default function Sales() {
    const { data: sales, loading: loadingSales, add: addSale, update: updateSale, remove: removeSale } = useSupabase<Sale>("sales");
    const { data: customers } = useSupabase<Customer>("customers");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Sale | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const filteredSales = useMemo(() => {
        return sales.filter((sale) => {
            if (!dateRange?.from) return true;
            const saleDate = new Date(sale.date);

            if (!dateRange.to) {
                return isWithinInterval(saleDate, {
                    start: startOfDay(dateRange.from),
                    end: endOfDay(dateRange.from)
                });
            }

            return isWithinInterval(saleDate, {
                start: startOfDay(dateRange.from),
                end: endOfDay(dateRange.to)
            });
        });
    }, [sales, dateRange]);

    const totalAmount = useMemo(() => {
        return filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0);
    }, [filteredSales]);


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
        const exportData = filteredSales.map((s) => ({
            date: format(new Date(s.date), "yyyy-MM-dd"),
            bill_number: s.bill_number,
            customer_name: s.customer_name,
            total_amount: formatINR(s.total_amount),
            notes: s.notes || "—",
        }));

        exportToPDF({
            title: "Navkar Enterprise - Sales",
            subtitle: `Sales log generated for ${filteredSales.length} records.`,
            filename: "sales_report",
            data: exportData,
            columns: [
                { key: "date", label: "Date" },
                { key: "bill_number", label: "Bill No" },
                { key: "customer_name", label: "Customer" },
                { key: "total_amount", label: "Total Amount" },
                { key: "notes", label: "Notes" },
            ],
            metrics: [
                { label: "Total Sales Base", value: formatINR(totalAmount) },
                { label: "Total Invoices", value: filteredSales.length.toString() }
            ]
        });
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
        <div className="max-w-6xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Sales</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Log and manage outward dispatch invoices.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-card soft-inset rounded-lg p-0.5">
                        <DateRangePicker date={dateRange} setDate={setDateRange} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5" disabled={filteredSales.length === 0}>
                        <Download className="h-4 w-4 text-muted-foreground" /> Export Report
                    </Button>
                    <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5 gradient-btn text-white">
                        <Plus className="h-4 w-4 text-white" /> Add Sale
                    </Button>
                </div>
            </div>
            <DataTable
                data={filteredSales}
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
