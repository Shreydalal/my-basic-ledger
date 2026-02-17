import { useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SaleForm } from "@/components/SaleForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { exportToCSV, parseCSV, importCSVFile, formatINR } from "@/lib/csv";
import { generateId } from "@/hooks/useLocalStorage";
import type { Sale, Customer } from "@/types";

export default function Sales() {
  const [sales, setSales] = useLocalStorage<Sale[]>("sales", []);
  const [customers] = useLocalStorage<Customer[]>("customers", []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);

  const handleSave = (s: Sale) => {
    setSales((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = s;
        return copy;
      }
      return [...prev, s];
    });
  };

  const handleDelete = (s: Sale) => {
    if (confirm("Delete this sale?")) {
      setSales((prev) => prev.filter((x) => x.id !== s.id));
    }
  };

  const handleExport = () => {
    const cols = [
      { key: "date", label: "Date" },
      { key: "customerName", label: "Customer" },
      { key: "itemName", label: "Item" },
      { key: "quantity", label: "Quantity" },
      { key: "price", label: "Price" },
      { key: "totalAmount", label: "Total" },
      { key: "notes", label: "Notes" },
    ];
    const exportData = sales.map((s) => ({
      ...s,
      date: format(new Date(s.date), "yyyy-MM-dd"),
    }));
    exportToCSV(exportData, "sales", cols);
  };

  const handleImport = () => {
    importCSVFile((text) => {
      const imported = parseCSV(text, (row) => ({
        id: generateId(),
        date: new Date(row["Date"] || new Date()).toISOString(),
        customerName: row["Customer"] || "",
        itemName: row["Item"] || "",
        quantity: parseFloat(row["Quantity"]) || 0,
        price: parseFloat(row["Price"]) || 0,
        totalAmount: parseFloat(row["Total"]) || (parseFloat(row["Quantity"]) || 0) * (parseFloat(row["Price"]) || 0),
        notes: row["Notes"] || undefined,
      }));
      setSales((prev) => [...prev, ...imported]);
    });
  };

  const columns = [
    { key: "date", label: "Date", sortable: true, render: (s: Sale) => format(new Date(s.date), "MMM d, yyyy") },
    { key: "customerName", label: "Customer", sortable: true },
    { key: "itemName", label: "Item", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (s: Sale) => formatINR(s.price) },
    { key: "totalAmount", label: "Total", sortable: true, render: (s: Sale) => formatINR(s.totalAmount) },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
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
        showDateFilter
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
