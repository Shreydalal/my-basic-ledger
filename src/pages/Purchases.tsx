import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { exportToCSV, parseCSV, importCSVFile, formatINR } from "@/lib/csv";
import { generateId } from "@/hooks/useLocalStorage";
import type { Purchase, Supplier } from "@/types";

export default function Purchases() {
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>("purchases", []);
  const [suppliers] = useLocalStorage<Supplier[]>("suppliers", []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);

  const handleSave = (p: Purchase) => {
    setPurchases((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = p;
        return copy;
      }
      return [...prev, p];
    });
  };

  const handleDelete = (p: Purchase) => {
    if (confirm("Delete this purchase?")) {
      setPurchases((prev) => prev.filter((x) => x.id !== p.id));
    }
  };

  const handleExport = () => {
    const cols = [
      { key: "date", label: "Date" },
      { key: "supplierName", label: "Supplier" },
      { key: "itemName", label: "Item" },
      { key: "quantity", label: "Quantity" },
      { key: "price", label: "Price" },
      { key: "totalAmount", label: "Total" },
      { key: "notes", label: "Notes" },
    ];
    const exportData = purchases.map((p) => ({
      ...p,
      date: format(new Date(p.date), "yyyy-MM-dd"),
    }));
    exportToCSV(exportData, "purchases", cols);
  };

  const handleImport = () => {
    importCSVFile((text) => {
      const imported = parseCSV(text, (row) => ({
        id: generateId(),
        date: new Date(row["Date"] || new Date()).toISOString(),
        supplierName: row["Supplier"] || "",
        itemName: row["Item"] || "",
        quantity: parseFloat(row["Quantity"]) || 0,
        price: parseFloat(row["Price"]) || 0,
        totalAmount: parseFloat(row["Total"]) || (parseFloat(row["Quantity"]) || 0) * (parseFloat(row["Price"]) || 0),
        notes: row["Notes"] || undefined,
      }));
      setPurchases((prev) => [...prev, ...imported]);
    });
  };

  const columns = [
    { key: "date", label: "Date", sortable: true, render: (p: Purchase) => format(new Date(p.date), "MMM d, yyyy") },
    { key: "supplierName", label: "Supplier", sortable: true },
    { key: "itemName", label: "Item", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (p: Purchase) => formatINR(p.price) },
    { key: "totalAmount", label: "Total", sortable: true, render: (p: Purchase) => formatINR(p.totalAmount) },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={purchases.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Purchase
          </Button>
        </div>
      </div>
      <DataTable
        data={purchases}
        columns={columns}
        searchPlaceholder="Search purchases..."
        showDateFilter
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
