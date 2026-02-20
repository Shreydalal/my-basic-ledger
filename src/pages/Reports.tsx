import { useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Loader2, FileText, Download } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSupabase } from "@/hooks/useSupabase";
import { exportToCSV, formatINR } from "@/lib/csv";
import type { Purchase, Supplier } from "@/types";

export default function Reports() {
    const { data: purchases, loading: loadingPurchases } = useSupabase<Purchase>("purchases");
    const { data: suppliers, loading: loadingSuppliers } = useSupabase<Supplier>("suppliers");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const validPurchases = purchases.filter((p) => {
        const billLower = p.bill_number?.trim().toLowerCase();
        return billLower !== 'k';
    });

    const filteredPurchases = validPurchases.filter((purchase) => {
        if (!dateRange?.from) return true;
        const purchaseDate = new Date(purchase.date);
        if (!dateRange.to) return isWithinInterval(purchaseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
        return isWithinInterval(purchaseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    });

    // Map to get supplier details
    const reportData = filteredPurchases.map(p => {
        const supplier = suppliers.find(s => s.name === p.supplier_name);
        return {
            ...p,
            supplier_gst: supplier?.gst_number || "—"
        };
    });

    const handleExport = () => {
        const cols = [
            { key: "date", label: "Date" },
            { key: "bill_number", label: "Bill No" },
            { key: "supplier_name", label: "Supplier" },
            { key: "supplier_gst", label: "GST No" },
            { key: "total_amount", label: "Total Amount" },
        ];
        const exportData = reportData.map((p) => ({
            ...p,
            date: format(new Date(p.date), "yyyy-MM-dd"),
        }));
        exportToCSV(exportData, "purchase_report", cols);
    };

    const columns = [
        { key: "date", label: "Date", sortable: true, render: (p: any) => format(new Date(p.date), "MMM d, yyyy") },
        { key: "bill_number", label: "Bill No", sortable: true },
        { key: "supplier_name", label: "Supplier", sortable: true },
        { key: "supplier_gst", label: "GST No", sortable: true },
        { key: "total_amount", label: "Amount", sortable: true, render: (p: any) => formatINR(p.total_amount) },
    ];

    if (loadingPurchases || loadingSuppliers) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold text-foreground">Purchase Report</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <DateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={reportData.length === 0}>
                            <Download className="h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>
            </div>
            <DataTable
                data={reportData}
                columns={columns}
                searchPlaceholder="Search by supplier..."
                searchKey="supplier_name"
            />
        </div>
    );
}
