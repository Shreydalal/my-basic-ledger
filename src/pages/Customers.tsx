import { useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { CustomerForm } from "@/components/CustomerForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { exportToCSV, parseCSV, importCSVFile } from "@/lib/csv";
import { generateId } from "@/hooks/useLocalStorage";
import type { Customer } from "@/types";

export default function Customers() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>("customers", []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const handleSave = (c: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = c;
        return copy;
      }
      return [...prev, c];
    });
  };

  const handleDelete = (c: Customer) => {
    if (confirm("Delete this customer?")) {
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    }
  };

  const handleExport = () => {
    exportToCSV(customers, "customers", [
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
      setCustomers((prev) => [...prev, ...imported]);
    });
  };

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", render: (c: Customer) => c.address || "—" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={customers.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>
      <DataTable
        data={customers}
        columns={columns}
        searchPlaceholder="Search customers..."
        searchKey="name"
        onEdit={(c) => { setEditing(c); setFormOpen(true); }}
        onDelete={handleDelete}
      />
      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}
