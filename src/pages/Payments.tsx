import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PaymentForm } from "@/components/PaymentForm";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Payment, Supplier, Purchase } from "@/types";

export default function Payments() {
  const { data: payments, loading: loadingPayments, add: addPayment, update: updatePayment, remove: removePayment } =
    useSupabase<Payment>("payments");
  const { data: suppliers } = useSupabase<Supplier>("suppliers");
  const { data: purchases } = useSupabase<Purchase>("purchases");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = useMemo(() => {
    return payments.filter((p) =>
      p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [payments, searchQuery]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredPayments]);

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
        bill_number: p.bill_number,
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
    const exportData = filteredPayments.map((p) => ({
      date: format(new Date(p.date), "yyyy-MM-dd"),
      supplier_name: p.supplier_name,
      amount: formatINR(p.amount),
      notes: p.notes || "—",
    }));

    exportToPDF({
      title: "Navkar Enterprise - Payments Report",
      subtitle: `Activity report generated for ${filteredPayments.length} payments.`,
      filename: "payments_report",
      data: exportData,
      columns: [
        { key: "date", label: "Date" },
        { key: "supplier_name", label: "Supplier" },
        { key: "amount", label: "Amount" },
        { key: "notes", label: "Notes" },
      ],
      metrics: [
        { label: "Total Paid", value: formatINR(totalAmount) },
        { label: "Total Transactions", value: filteredPayments.length.toString() },
      ],
    });
  };

  if (loadingPayments) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage and review outward cash flows.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5" disabled={filteredPayments.length === 0}>
            <Download className="h-4 w-4 text-muted-foreground" /> Export Report
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-1.5 gradient-btn text-white"
          >
            <Plus className="h-4 w-4 text-white" /> Add Payment
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
        purchases={purchases}
      />
    </div>
  );
}

