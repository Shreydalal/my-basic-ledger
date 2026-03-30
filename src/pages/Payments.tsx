import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PaymentForm } from "@/components/PaymentForm";
import { useSupabase } from "@/hooks/useSupabase";
import { exportToCSV, formatINR } from "@/lib/csv";
import type { Payment, Supplier } from "@/types";

export default function Payments() {
  const { data: payments, loading: loadingPayments, add: addPayment, update: updatePayment, remove: removePayment } =
    useSupabase<Payment>("payments");
  const { data: suppliers } = useSupabase<Supplier>("suppliers");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (p: Payment) => format(new Date(p.date), "MMM d, yyyy"),
      },
      { key: "supplier_name", label: "Supplier", sortable: true },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        className: "text-right whitespace-nowrap",
        render: (p: Payment) => <span className="font-medium">{formatINR(p.amount)}</span>,
      },
      {
        key: "notes",
        label: "Notes",
        className: "hidden md:table-cell",
        render: (p: Payment) => p.notes || "—",
      },
    ],
    []
  );

  const handleSave = async (p: Payment) => {
    if (editing) {
      await updatePayment(p.id, {
        date: p.date,
        supplier_name: p.supplier_name,
        amount: p.amount,
        notes: p.notes,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = p;
      await addPayment(rest);
    }
  };

  const handleDelete = async (p: Payment) => {
    if (confirm("Delete this payment?")) {
      await removePayment(p.id);
    }
  };

  const handleExport = () => {
    const cols = [
      { key: "date", label: "Date" },
      { key: "supplier_name", label: "Supplier" },
      { key: "amount", label: "Amount" },
      { key: "notes", label: "Notes" },
    ];
    const exportData = payments.map((p) => ({
      ...p,
      date: format(new Date(p.date), "yyyy-MM-dd"),
    }));
    exportToCSV(exportData, "payments", cols);
  };

  if (loadingPayments) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={payments.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Payment
          </Button>
        </div>
      </div>

      <DataTable
        data={payments}
        columns={columns}
        searchPlaceholder="Search payments..."
        searchKey="supplier_name"
        onEdit={(p) => {
          setEditing(p);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
      />

      <PaymentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editing}
        suppliers={suppliers}
      />
    </div>
  );
}

