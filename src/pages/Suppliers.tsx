import { useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { SupplierForm } from "@/components/SupplierForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { exportToCSV, parseCSV, importCSVFile } from "@/lib/csv";
import { generateId } from "@/hooks/useLocalStorage";
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

  const handleExport = () => {
    exportToCSV(suppliers, "suppliers", [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
    ]);
  };

  const handleImport = () => {
    importCSVFile((text) => {
      const imported = parseCSV(text, (row) => ({
        id: generateId(),
        name: row["Name"] || "",
        phone: row["Phone"] || "",
        email: row["Email"] || "",
        address: row["Address"] || undefined,
      }));
      setSuppliers((prev) => [...prev, ...imported]);
    });
  };

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", render: (s: Supplier) => s.address || "—" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={suppliers.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        </div>
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
