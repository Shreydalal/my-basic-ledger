import { useState } from "react";
import { Plus, Download, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { CustomerForm } from "@/components/CustomerForm";
import { ReceiptForm } from "@/components/ReceiptForm";
import { CustomerDetails } from "@/components/CustomerDetails";
import { useSupabase } from "@/hooks/useSupabase";
import { exportToCSV, formatINR } from "@/lib/csv";
import type { Customer, Sale, Receipt } from "@/types";

export default function Customers() {
  const { data: customers, loading: loadingCustomers, add: addCustomer, update: updateCustomer, remove: removeCustomer } = useSupabase<Customer>("customers");
  const { data: sales } = useSupabase<Sale>("sales");
  const { data: receipts, add: addReceipt } = useSupabase<Receipt>("receipts");

  const [formOpen, setFormOpen] = useState(false);
  const [receiptFormOpen, setReceiptFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const totalReceivable = (() => {
    const totalOpening = customers.reduce((sum, c) => sum + (c.opening_balance || 0), 0);
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
    return totalOpening + totalSales - totalReceipts;
  })();

  const handleSave = async (c: Customer) => {
    if (editing) {
      await updateCustomer(c.id, {
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        opening_balance: c.opening_balance
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = c;
      await addCustomer(rest);
    }
  };

  const handleSaveReceipt = async (r: Receipt) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = r;
    await addReceipt({
      ...rest,
      customer_name: selectedCustomer ? selectedCustomer.name : rest.customer_name
    });
  };

  const handleDelete = async (c: Customer) => {
    if (confirm("Delete this customer?")) {
      await removeCustomer(c.id);
    }
  };

  const handleExport = () => {
    const exportData = customers.map(c => ({
      ...c,
      current_balance: getPendingAmount(c.name)
    }));

    exportToCSV(exportData, "customers", [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "current_balance", label: "Current Bal" },
      { key: "address", label: "Address" },
    ]);
  };

  const getPendingAmount = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    const openingBalance = customer?.opening_balance || 0;

    const totalSales = sales
      .filter((s) => s.customer_name === customerName)
      .reduce((sum, s) => sum + s.total_amount, 0);

    const totalReceipts = receipts
      .filter((r) => r.customer_name === customerName)
      .reduce((sum, r) => sum + r.amount, 0);

    return (totalSales + openingBalance) - totalReceipts;
  };

  const columns = [
    { key: "name", label: "Name", sortable: true, className: "max-w-[120px] truncate font-medium" },
    { key: "phone", label: "Phone", className: "hidden sm:table-cell" },
    { key: "email", label: "Email", className: "hidden md:table-cell" },
    { key: "address", label: "Address", className: "hidden lg:table-cell", render: (c: Customer) => c.address || "—" },
    {
      key: "pending",
      label: "Pending",
      className: "text-right whitespace-nowrap",
      render: (c: Customer) => <span className="font-bold">{formatINR(getPendingAmount(c.name))}</span>
    },
    {
      key: "actions",
      label: "Actions",
      className: "hidden md:table-cell",
      render: (c: Customer) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCustomer(c);
            setReceiptFormOpen(true);
          }}
        >
          <IndianRupee className="h-3.5 w-3.5" /> Receive
        </Button>
      )
    }
  ];

  if (loadingCustomers) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={customers.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex justify-between items-center shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">Total Receivable (Outstanding)</span>
          <span className="text-2xl font-bold text-primary">{formatINR(totalReceivable)}</span>
        </div>
      </div>
      <DataTable
        data={customers}
        columns={columns}
        searchPlaceholder="Search customers..."
        searchKey="name"
        onEdit={(c) => { setEditing(c); setFormOpen(true); }}
        onDelete={handleDelete}
        onRowClick={(c) => {
          setSelectedCustomer(c);
          setDetailsOpen(true);
        }}
      />
      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
      <ReceiptForm
        open={receiptFormOpen}
        onClose={() => { setReceiptFormOpen(false); setSelectedCustomer(null); }}
        onSave={handleSaveReceipt}
        customers={customers}
        defaultCustomer={selectedCustomer?.name}
      />
      <CustomerDetails
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelectedCustomer(null); }}
        customer={selectedCustomer}
        onEdit={(c) => { setEditing(c); setFormOpen(true); }}
        onDelete={handleDelete}
        onReceive={(c) => { setSelectedCustomer(c); setReceiptFormOpen(true); }}
        sales={sales}
        receipts={receipts}
      />
    </div>
  );
}
