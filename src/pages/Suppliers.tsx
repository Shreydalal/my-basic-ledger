import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SupplierForm } from "@/components/SupplierForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Supplier } from "@/types";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>("suppliers", []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const handleSave = (s: Supplier) => {
    setSuppliers((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = s;
        return copy;
      }
      return [...prev, s];
    });
  };

  const handleDelete = (s: Supplier) => {
    if (confirm("Delete this supplier?")) {
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
    }
  };

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", render: (s: Supplier) => s.address || "—" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>
      <DataTable
        data={suppliers}
        columns={columns}
        searchPlaceholder="Search suppliers..."
        searchKey="name"
        onEdit={(s) => { setEditing(s); setFormOpen(true); }}
        onDelete={handleDelete}
      />
      <SupplierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}
