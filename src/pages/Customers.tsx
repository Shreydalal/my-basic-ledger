import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { CustomerForm } from "@/components/CustomerForm";
import { ReceiptForm } from "@/components/ReceiptForm";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Customer, Sale, Receipt } from "@/types";

export default function Customers() {
  const navigate = useNavigate();
  const { data: customers, loading: loadingCustomers, add: addCustomer } = useSupabase<Customer>("customers");
  const { data: sales } = useSupabase<Sale>("sales");
  const { data: receipts, add: addReceipt } = useSupabase<Receipt>("receipts");

  const [formOpen, setFormOpen] = useState(false);
  const [receiptFormOpen, setReceiptFormOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const totalReceivable = (() => {
    const totalOpening = customers.reduce((sum, c) => sum + (c.opening_balance || 0), 0);
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
    return totalOpening + totalSales - totalReceipts;
  })();

  const handleSave = async (c: Customer) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = c;
    await addCustomer(rest);
  };

  const handleSaveReceipt = async (r: Receipt) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = r;
    await addReceipt({
      ...rest,
      customer_name: selectedCustomer ? selectedCustomer.name : rest.customer_name
    });
  };

    const handleExport = () => {
        const exportData = customers.map((c) => ({
            name: c.name,
            phone: c.phone || "—",
            email: c.email || "—",
            current_balance: formatINR(getPendingAmount(c.name)),
            address: c.address || "—",
        }));

        exportToPDF({
            title: "Navkar Enterprise - Customers",
            subtitle: "A complete list of registered clients and accounts receivable.",
            filename: "customers_report",
            data: exportData,
            columns: [
                { key: "name", label: "Name" },
                { key: "current_balance", label: "Outstanding" },
                { key: "phone", label: "Phone" },
                { key: "email", label: "Email" },
                { key: "address", label: "Address" }
            ],
            metrics: [
                { label: "Total Accounts Receivable", value: formatINR(totalReceivable) },
                { label: "Total Customers", value: customers.length.toString() }
            ]
        });
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
        <div className="max-w-6xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Customers</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Manage clientele base and accounts receivable.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5" disabled={customers.length === 0}>
                        <Download className="h-4 w-4 text-muted-foreground" /> Export Report
                    </Button>
                    <Button onClick={() => setFormOpen(true)} className="gap-1.5 gradient-btn text-white">
                        <Plus className="h-4 w-4 text-white" /> Add Customer
                    </Button>
                </div>
            </div>

            <div className="mb-10 w-full sm:w-80 bg-card rounded-xl p-5 soft-inset flex flex-col justify-between items-start shadow-sm whisper-shadow border-0">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">Total Receivable</span>
                <span className="text-3xl font-bold text-primary break-all">{formatINR(totalReceivable)}</span>
            </div>
      <DataTable
        data={customers}
        columns={columns}
        searchPlaceholder="Search customers..."
        searchKey="name"
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
      />
      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
      <ReceiptForm
        open={receiptFormOpen}
        onClose={() => { setReceiptFormOpen(false); setSelectedCustomer(null); }}
        onSave={handleSaveReceipt}
        customers={customers}
        defaultCustomer={selectedCustomer?.name}
      />
    </div>
  );
}
