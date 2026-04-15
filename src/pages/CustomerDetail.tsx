import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ChevronLeft, IndianRupee, Loader2, Download, History, MapPin, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { ReceiptForm } from "@/components/ReceiptForm";
import { CustomerForm } from "@/components/CustomerForm";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Customer, Sale, Receipt } from "@/types";

export default function CustomerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: customers, loading: loadingCustomers, update: updateCustomer, remove: removeCustomer } = useSupabase<Customer>("customers");
    const { data: sales } = useSupabase<Sale>("sales");
    const {
        data: receipts,
        add: addReceipt,
        update: updateReceipt,
        remove: removeReceipt,
    } = useSupabase<Receipt>("receipts");

    const [receiptFormOpen, setReceiptFormOpen] = useState(false);
    const [editCustomerOpen, setEditCustomerOpen] = useState(false);
    const [selectedBillNumber, setSelectedBillNumber] = useState<string | undefined>(undefined);
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);

    const customer = customers.find((c) => c.id === id);

    const customerSales = useMemo(
        () =>
            sales
                .filter((s) => s.customer_name === customer?.name)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [sales, customer]
    );

    const customerReceipts = useMemo(
        () =>
            receipts
                .filter((r) => r.customer_name === customer?.name)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [receipts, customer]
    );

    const metrics = useMemo(() => {
        if (!customer) return null;
        const totalSales = customerSales.reduce((sum, s) => sum + s.total_amount, 0);
        const totalReceipts = customerReceipts.reduce((sum, r) => sum + r.amount, 0);
        const openingBalance = customer.opening_balance || 0;
        const pendingAmount = totalSales + openingBalance - totalReceipts;

        const lastReceipt = customerReceipts.length > 0 ? customerReceipts[0].date : null;

        return { totalSales, totalReceipts, pendingAmount, lastReceipt, openingBalance };
    }, [customer, customerSales, customerReceipts]);

    // Waterfall bill reconciliation — same logic as SupplierDetail
    const billData = useMemo(() => {
        const sortedSales = [...customerSales].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let excessPool = 0;

        // 1. Pool generic receipts (no bill_number)
        customerReceipts.forEach((r) => {
            if (!("bill_number" in r) || !(r as any).bill_number) {
                excessPool += r.amount;
            }
        });

        // 2. First pass: allocate specific receipts per bill
        const billStatus = sortedSales.map((sale) => {
            const specificReceipts = customerReceipts.filter(
                (r) => (r as any).bill_number && (r as any).bill_number === sale.bill_number
            );
            const paidSpecifically = specificReceipts.reduce((sum, r) => sum + r.amount, 0);

            return {
                ...sale,
                amount_remaining: sale.total_amount - paidSpecifically,
                amount_paid: paidSpecifically,
            };
        });

        // 3. Second pass: cascade excess pool to oldest unpaid bills
        for (let i = 0; i < billStatus.length; i++) {
            if (excessPool > 0 && billStatus[i].amount_remaining > 0) {
                const deduction = Math.min(billStatus[i].amount_remaining, excessPool);
                billStatus[i].amount_remaining -= deduction;
                billStatus[i].amount_paid += deduction;
                excessPool -= deduction;
            }

            if (billStatus[i].amount_remaining < 0) {
                let over = Math.abs(billStatus[i].amount_remaining);
                billStatus[i].amount_remaining = 0;
                billStatus[i].amount_paid = billStatus[i].total_amount;

                for (let j = i + 1; j < billStatus.length; j++) {
                    if (over > 0 && billStatus[j].amount_remaining > 0) {
                        const deduction = Math.min(billStatus[j].amount_remaining, over);
                        billStatus[j].amount_remaining -= deduction;
                        billStatus[j].amount_paid += deduction;
                        over -= deduction;
                    }
                }

                if (over > 0) {
                    billStatus[i].amount_remaining = -over;
                    billStatus[i].amount_paid += over;
                }
            }
        }

        return billStatus.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [customerSales, customerReceipts]);

    const handleEditCustomer = async (c: Customer) => {
        await updateCustomer(c.id, {
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address,
            opening_balance: c.opening_balance,
        });
    };

    const handleDeleteCustomer = async () => {
        if (!customer) return;
        if (confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) {
            await removeCustomer(customer.id);
            navigate("/customers");
        }
    };

    const handleSaveReceipt = async (r: Receipt) => {
        if (editingReceipt) {
            await updateReceipt(r.id, {
                date: r.date,
                customer_name: r.customer_name,
                amount: r.amount,
                notes: r.notes,
            });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _, ...rest } = r;
            await addReceipt({
                ...rest,
                customer_name: customer?.name || rest.customer_name,
            });
        }
    };

    const handleDeleteReceipt = async (r: Receipt) => {
        if (confirm("Delete this receipt?")) {
            await removeReceipt(r.id);
        }
    };

    const handleExport = () => {
        if (!customer) return;
        const exportData = billData.map((b) => ({
            date: format(new Date(b.date), "yyyy-MM-dd"),
            bill_number: b.bill_number,
            total_amount: formatINR(b.total_amount),
            amount_paid: formatINR(b.amount_paid),
            amount_remaining: formatINR(b.amount_remaining),
            notes: b.notes || "—",
        }));

        const totalRemaining = billData.reduce((sum, b) => sum + b.amount_remaining, 0);

        exportToPDF({
            title: customer.name,
            subtitle: "Customer Account Statement & Billing History.",
            filename: `${customer.name.replace(/\s+/g, "_")}_statement`,
            data: exportData,
            columns: [
                { key: "date", label: "Date" },
                { key: "bill_number", label: "Bill #" },
                { key: "total_amount", label: "Bill Total" },
                { key: "amount_paid", label: "Received" },
                { key: "amount_remaining", label: "Remaining" },
                { key: "notes", label: "Notes" },
            ],
            metrics: [
                { label: "Account Outstanding", value: formatINR(metrics?.pendingAmount || 0) },
                { label: "Report Outstanding", value: formatINR(totalRemaining) },
                { label: "Unpaid Bills", value: billData.filter((b) => b.amount_remaining > 0).length.toString() },
            ],
        });
    };

    // Only hard-block if customers haven't loaded at all yet (can't find who this page is for).
    // Sales and receipts load in the background — tables render progressively.
    if (loadingCustomers && customers.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
                <h2 className="text-2xl font-bold">Customer not found</h2>
                <Button onClick={() => navigate("/customers")}>Go Back</Button>
            </div>
        );
    }

    const billColumns = [
        {
            key: "date",
            label: "Date",
            sortable: true,
            className: "whitespace-nowrap",
            render: (s: any) => format(new Date(s.date), "MMM d, yyyy"),
        },
        {
            key: "time_since",
            label: "Time Since",
            className: "text-muted-foreground whitespace-nowrap",
            render: (s: any) => formatDistanceToNowStrict(new Date(s.date), { addSuffix: true }),
        },
        { key: "bill_number", label: "Bill Number", sortable: true },
        {
            key: "total_amount",
            label: "Total Amount",
            sortable: true,
            className: "text-right",
            render: (s: any) => formatINR(s.total_amount),
        },
        {
            key: "amount_remaining",
            label: "Remaining",
            sortable: true,
            className: "text-right",
            render: (s: any) => (
                <span className={`font-medium ${s.amount_remaining > 0 ? "text-destructive" : "text-green-600"}`}>
                    {formatINR(s.amount_remaining)}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            className: "text-right hidden sm:table-cell",
            render: (s: any) =>
                s.amount_remaining > 0 ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBillNumber(s.bill_number);
                            setReceiptFormOpen(true);
                        }}
                    >
                        <IndianRupee className="h-3.5 w-3.5 mr-1.5" /> Receive
                    </Button>
                ) : (
                    <span className="text-sm text-green-600 font-medium px-2 inline-block mt-2">Fully Paid</span>
                ),
        },
    ];

    const receiptColumns = [
        {
            key: "date",
            label: "Date",
            sortable: true,
            className: "w-[120px]",
            render: (r: any) => format(new Date(r.date), "MMM d, yyyy"),
        },
        {
            key: "amount",
            label: "Amount",
            sortable: true,
            className: "text-right font-medium text-green-600",
            render: (r: any) => formatINR(r.amount),
        },
        { key: "notes", label: "Notes", className: "hidden sm:table-cell text-muted-foreground truncate max-w-[200px]", render: (r: any) => r.notes || "—" },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 mt-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="hover:bg-muted/50 rounded-full h-10 w-10">
                        <Link to="/customers">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight truncate">
                        {customer.name}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleExport} className="gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="hidden sm:inline">Export Report</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setEditCustomerOpen(true)} className="h-9 w-9">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDeleteCustomer} className="h-9 w-9 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => { setSelectedBillNumber(undefined); setReceiptFormOpen(true); }}
                        className="gap-2 gradient-btn text-white"
                    >
                        <IndianRupee className="h-4 w-4 text-white" /> Receive Payment
                    </Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Sales</span>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">
                        {formatINR(metrics?.totalSales || 0)}
                    </span>
                </div>
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Received</span>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 break-words">
                        {formatINR(metrics?.totalReceipts || 0)}
                    </span>
                </div>
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pending Amount</span>
                    <div className="flex flex-col min-w-0">
                        <span className={`text-xl sm:text-2xl lg:text-3xl font-bold break-words ${(metrics?.pendingAmount || 0) > 0 ? "text-warning" : "text-green-600"}`}>
                            {formatINR(metrics?.pendingAmount || 0)}
                        </span>
                        {metrics?.openingBalance ? (
                            <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                                Incl {formatINR(metrics.openingBalance)} opening
                            </span>
                        ) : null}
                    </div>
                    {(metrics?.pendingAmount || 0) > 0 && (
                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-warning/5 to-transparent pointer-events-none" />
                    )}
                </div>
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Last Activity</span>
                    <span className="text-lg sm:text-xl font-bold mt-1 text-foreground break-words">
                        {metrics?.lastReceipt
                            ? formatDistanceToNowStrict(new Date(metrics.lastReceipt), { addSuffix: true })
                            : "—"}
                    </span>
                </div>
            </div>

            {/* Details + Bills */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Contact Info */}
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-semibold text-lg pb-1 text-muted-foreground">Customer Details</h3>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-5 space-y-4 text-sm relative overflow-hidden transition-all hover:shadow-md">
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-primary" />
                            <a href={`tel:${customer.phone}`} className="hover:underline font-medium text-foreground">
                                {customer.phone}
                            </a>
                        </div>
                        {customer.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-primary" />
                                <span className="text-foreground">{customer.email}</span>
                            </div>
                        )}
                        {customer.address && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                <span className="text-foreground">{customer.address}</span>
                            </div>
                        )}
                        {metrics?.openingBalance ? (
                            <div className="flex flex-col pt-3 mt-3 relative before:absolute before:top-0 before:left-0 before:h-[1px] before:w-full before:bg-border/30">
                                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">Opening Balance</span>
                                <span className="font-medium text-foreground">{formatINR(metrics.openingBalance)}</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Bills & History */}
                <div className="md:col-span-2 space-y-4 min-w-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2 pb-1 text-muted-foreground">
                        <History className="h-4 w-4" />
                        Bills & History
                    </h3>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5 overflow-hidden transition-all hover:shadow-md">
                        <DataTable
                            data={billData}
                            columns={billColumns}
                            searchPlaceholder="Search bills..."
                            searchKey="bill_number"
                        />
                    </div>
                </div>

                {/* Receipt History */}
                <div className="md:col-span-3 space-y-4 min-w-0 mt-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2 pb-1 text-muted-foreground">
                        <History className="h-4 w-4" />
                        Receipt History
                    </h3>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5 overflow-hidden transition-all hover:shadow-md">
                        <DataTable
                            data={customerReceipts}
                            columns={receiptColumns}
                            searchPlaceholder="Search receipts..."
                            searchKey="notes"
                            onEdit={(r) => {
                                setEditingReceipt(r);
                                setReceiptFormOpen(true);
                            }}
                            onDelete={handleDeleteReceipt}
                        />
                    </div>
                </div>
            </div>

            <ReceiptForm
                open={receiptFormOpen}
                onClose={() => {
                    setReceiptFormOpen(false);
                    setSelectedBillNumber(undefined);
                    setEditingReceipt(null);
                }}
                onSave={handleSaveReceipt}
                customers={[customer]}
                defaultCustomer={customer.name}
                initial={editingReceipt}
            />
            <CustomerForm
                open={editCustomerOpen}
                onClose={() => setEditCustomerOpen(false)}
                onSave={handleEditCustomer}
                initial={customer}
            />
        </div>
    );
}
