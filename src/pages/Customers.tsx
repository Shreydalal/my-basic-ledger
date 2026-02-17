import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { CustomerForm } from "@/components/CustomerForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", render: (c: Customer) => c.address || "—" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
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
