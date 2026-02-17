import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PurchaseForm } from "@/components/PurchaseForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Purchase } from "@/types";

export default function Purchases() {
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>("purchases", []);
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

  const columns = [
    { key: "date", label: "Date", sortable: true, render: (p: Purchase) => format(new Date(p.date), "MMM d, yyyy") },
    { key: "supplierName", label: "Supplier", sortable: true },
    { key: "itemName", label: "Item", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (p: Purchase) => `$${p.price.toFixed(2)}` },
    { key: "totalAmount", label: "Total", sortable: true, render: (p: Purchase) => `$${p.totalAmount.toFixed(2)}` },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Purchase
        </Button>
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
      />
    </div>
  );
}
