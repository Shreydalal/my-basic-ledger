import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SaleForm } from "@/components/SaleForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Sale } from "@/types";

export default function Sales() {
  const [sales, setSales] = useLocalStorage<Sale[]>("sales", []);
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

  const columns = [
    { key: "date", label: "Date", sortable: true, render: (s: Sale) => format(new Date(s.date), "MMM d, yyyy") },
    { key: "customerName", label: "Customer", sortable: true },
    { key: "itemName", label: "Item", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (s: Sale) => `$${s.price.toFixed(2)}` },
    { key: "totalAmount", label: "Total", sortable: true, render: (s: Sale) => `$${s.totalAmount.toFixed(2)}` },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Sale
        </Button>
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
      />
    </div>
  );
}
