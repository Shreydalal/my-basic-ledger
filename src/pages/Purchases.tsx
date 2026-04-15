import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Plus, Download, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PurchaseForm } from "@/components/PurchaseForm";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Purchase, Supplier, Payment } from "@/types";

export default function Purchases() {
  const { data: purchases, loading: loadingPurchases, add: addPurchase, update: updatePurchase, remove: removePurchase } = useSupabase<Purchase>("purchases");
  const { data: suppliers } = useSupabase<Supplier>("suppliers");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      if (!dateRange?.from) return true;
      const purchaseDate = new Date(purchase.date);

      if (!dateRange.to) {
        return isWithinInterval(purchaseDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.from)
        });
      }

      return isWithinInterval(purchaseDate, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    });
  }, [purchases, dateRange]);

  const totalAmount = useMemo(() => {
    return filteredPurchases.reduce((acc, curr) => acc + curr.total_amount, 0);
  }, [filteredPurchases]);

  const handleSave = async (p: Purchase) => {
    if (editing) {
      await updatePurchase(p.id, {
        date: p.date,
        supplier_name: p.supplier_name,
        bill_number: p.bill_number,
        total_amount: p.total_amount,
        notes: p.notes
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = p;
      await addPurchase(rest);
    }
  };

  const handleDelete = async (p: Purchase) => {
    if (confirm("Delete this purchase?")) {
      await removePurchase(p.id);
    }
  };

  const handleExport = () => {
    const exportData = filteredPurchases.map((p) => ({
      date: format(new Date(p.date), "yyyy-MM-dd"),
      bill_number: p.bill_number,
      supplier_name: p.supplier_name,
      total_amount: formatINR(p.total_amount),
      notes: p.notes || "—",
    }));

    exportToPDF({
      title: "Navkar Enterprise - Purchases",
      subtitle: `Purchase log generated for ${filteredPurchases.length} records.`,
      filename: "purchases_report",
      data: exportData,
      columns: [
        { key: "date", label: "Date" },
        { key: "bill_number", label: "Bill No" },
        { key: "supplier_name", label: "Supplier" },
        { key: "total_amount", label: "Total Amount" },
        { key: "notes", label: "Notes" },
      ],
      metrics: [
        { label: "Total Purchases", value: formatINR(totalAmount) },
        { label: "Total Bills", value: filteredPurchases.length.toString() }
      ]
    });
  };

  const columns = [
    { key: "date", label: "Date", sortable: true, render: (p: Purchase) => format(new Date(p.date), "MMM d, yyyy") },
    { key: "bill_number", label: "Bill No", sortable: true },
    { key: "supplier_name", label: "Supplier", sortable: true },
    { key: "total_amount", label: "Amount", sortable: true, render: (p: Purchase) => formatINR(p.total_amount) },
  ];

  if (loadingPurchases) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Purchases</h1>
          <p className="text-muted-foreground mt-2 font-medium">Log and manage inward inventory bills.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-card soft-inset rounded-lg p-0.5">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5" disabled={filteredPurchases.length === 0}>
            <Download className="h-4 w-4 text-muted-foreground" /> Export Report
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5 gradient-btn text-white">
            <Plus className="h-4 w-4 text-white" /> Add Purchase
          </Button>
        </div>
      </div>

      <DataTable
        data={filteredPurchases}
        columns={columns}
        searchPlaceholder="Search purchases..."
        searchKey="supplier_name"
        onEdit={(p) => { setEditing(p); setFormOpen(true); }}
        onDelete={handleDelete}
      />
      
      <PurchaseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editing}
        suppliers={suppliers}
      />
    </div>
  );
}
