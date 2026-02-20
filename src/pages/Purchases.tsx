import { useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Plus, Download, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PurchaseForm } from "@/components/PurchaseForm";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSupabase } from "@/hooks/useSupabase";
import { exportToCSV, formatINR } from "@/lib/csv";
import type { Purchase, Supplier, Payment } from "@/types";

export default function Purchases() {
  const { data: purchases, loading: loadingPurchases, add: addPurchase, update: updatePurchase, remove: removePurchase } = useSupabase<Purchase>("purchases");
  const { data: suppliers } = useSupabase<Supplier>("suppliers");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredPurchases = purchases.filter((purchase) => {
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
    const cols = [
      { key: "date", label: "Date" },
      { key: "bill_number", label: "Bill No" },
      { key: "supplier_name", label: "Supplier" },
      { key: "total_amount", label: "Total Amount" },
      { key: "notes", label: "Notes" },
    ];
    const exportData = filteredPurchases.map((p) => ({
      ...p,
      date: format(new Date(p.date), "yyyy-MM-dd"),
    }));
    exportToCSV(exportData, "purchases", cols);
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={filteredPurchases.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Purchase
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
