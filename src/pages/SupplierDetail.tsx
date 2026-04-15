import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ChevronLeft, IndianRupee, Loader2, Download, History, MapPin, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PaymentForm } from "@/components/PaymentForm";
import { SupplierForm } from "@/components/SupplierForm";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Supplier, Purchase, Payment } from "@/types";

export default function SupplierDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { data: suppliers, loading: loadingSuppliers, update: updateSupplier, remove: removeSupplier } = useSupabase<Supplier>("suppliers");
    const { data: purchases, loading: loadingPurchases } = useSupabase<Purchase>("purchases");
    const { data: payments, loading: loadingPayments, add: addPayment, update: updatePayment, remove: removePayment } = useSupabase<Payment>("payments");

    const [paymentFormOpen, setPaymentFormOpen] = useState(false);
    const [editSupplierOpen, setEditSupplierOpen] = useState(false);
    const [selectedBillNumber, setSelectedBillNumber] = useState<string | undefined>(undefined);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    const supplier = suppliers.find(s => s.id === id);

    const supplierPurchases = useMemo(() => 
        purchases.filter(p => p.supplier_name === supplier?.name).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [purchases, supplier]
    );

    const supplierPayments = useMemo(() => 
        payments.filter(p => p.supplier_name === supplier?.name).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [payments, supplier]
    );

    const metrics = useMemo(() => {
        if (!supplier) return null;
        const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.total_amount, 0);
        const totalPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
        const openingBalance = supplier.opening_balance || 0;
        const pendingAmount = totalPurchases + openingBalance - totalPayments;
        
        const lastPayment = supplierPayments.length > 0 ? supplierPayments[0].date : null;
        
        return { totalPurchases, totalPayments, pendingAmount, lastPayment, openingBalance };
    }, [supplier, supplierPurchases, supplierPayments]);

    // Calculate remaining amount per bill using a Waterfall method
    // Specific payments apply to their bills first. Any overpayment overflows into an excess pool.
    // Generic payments (no bill number) also go into the excess pool.
    // Finally, the excess pool cascades down starting from the oldest pending bills.
    const billData = useMemo(() => {
        // Sort chronologically (oldest first) to flow the waterfall correctly
        const sortedPurchases = [...supplierPurchases].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let excessPool = 0;
        
        // 1. Pool generic payments
        supplierPayments.forEach(p => {
            if (!p.bill_number) {
                excessPool += p.amount;
            }
        });

        // 2. First-pass: allocate specific payments
        const billStatus = sortedPurchases.map(purchase => {
            const specificPayments = supplierPayments.filter(p => p.bill_number && p.bill_number === purchase.bill_number);
            const paidSpecifically = specificPayments.reduce((sum, p) => sum + p.amount, 0);
            
            return {
                ...purchase,
                amount_remaining: purchase.total_amount - paidSpecifically,
                amount_paid: paidSpecifically
            };
        });

        // 3. Second-pass: cascade the excess pool to the oldest unpaid bills
        for (let i = 0; i < billStatus.length; i++) {
            // A. Apply any generic payments floating in the pool to this bill first
            if (excessPool > 0 && billStatus[i].amount_remaining > 0) {
                const deduction = Math.min(billStatus[i].amount_remaining, excessPool);
                billStatus[i].amount_remaining -= deduction;
                billStatus[i].amount_paid += deduction;
                excessPool -= deduction;
            }

            // B. If this specific bill is overpaid, cascade its excess strictly FORWARD to future bills
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

                // If there's STILL excess after cascading through all future bills, leave it parked on this bill
                if (over > 0) {
                    billStatus[i].amount_remaining = -over;
                    billStatus[i].amount_paid += over;
                }
            }
        }

        // Return to original UI sort order (newest first)
        return billStatus.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [supplierPurchases, supplierPayments]);

    const handleEditSupplier = async (s: Supplier) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, ...updates } = s;
        await updateSupplier(s.id, updates);
    };

    const handleDeleteSupplier = async () => {
        if (!supplier) return;
        if (confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) {
            await removeSupplier(supplier.id);
            navigate("/suppliers");
        }
    };

    const handleSavePayment = async (p: Payment) => {
        if (editingPayment) {
            await updatePayment(p.id, {
                date: p.date,
                supplier_name: p.supplier_name,
                amount: p.amount,
                notes: p.notes,
                bill_number: p.bill_number,
            });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _, ...rest } = p;
            await addPayment({
                ...rest,
                supplier_name: supplier?.name || rest.supplier_name
            });
        }
    };

    const handleDeletePayment = async (p: Payment) => {
        if (confirm("Delete this payment?")) {
            await removePayment(p.id);
        }
    };

    const handleExport = () => {
        if (!supplier) return;
        const filteredBills = billData.filter(b => !/k/i.test(b.bill_number));
        const exportData = filteredBills.map(b => ({
            date: format(new Date(b.date), "yyyy-MM-dd"),
            bill_number: b.bill_number,
            total_amount: formatINR(b.total_amount),
            amount_paid: formatINR(b.amount_paid),
            amount_remaining: formatINR(b.amount_remaining),
            notes: b.notes || "—"
        }));

        const totalRemaining = filteredBills.reduce((sum, b) => sum + b.amount_remaining, 0);

        exportToPDF({
            title: supplier.name, // Using supplier name as requested
            subtitle: "Supplier Account Statement & Billing History.",
            filename: `${supplier.name.replace(/\s+/g, '_')}_statement`,
            data: exportData,
            columns: [
                { key: "date", label: "Date" },
                { key: "bill_number", label: "Bill #" },
                { key: "total_amount", label: "Bill Total" },
                { key: "amount_paid", label: "Paid" },
                { key: "amount_remaining", label: "Remaining" },
                { key: "notes", label: "Notes" }
            ],
            metrics: [
                { label: "Account Outstanding", value: formatINR(metrics?.pendingAmount || 0) },
                { label: "Report Outstanding", value: formatINR(totalRemaining) },
                { label: "Unpaid Bills", value: filteredBills.filter(b => b.amount_remaining > 0).length.toString() }
            ]
        });
    };

    // Only hard-block if suppliers haven't loaded at all yet.
    // Purchases and payments load progressively in the background.
    if (loadingSuppliers && suppliers.length === 0) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!supplier) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
                <h2 className="text-2xl font-bold">Supplier not found</h2>
                <Button onClick={() => navigate("/suppliers")}>Go Back</Button>
            </div>
        );
    }

    const columns = [
        {
            key: "date",
            label: "Date",
            sortable: true,
            className: "whitespace-nowrap",
            render: (p: any) => format(new Date(p.date), "MMM d, yyyy")
        },
        {
            key: "time_since",
            label: "Time Since",
            className: "text-muted-foreground whitespace-nowrap",
            render: (p: any) => formatDistanceToNowStrict(new Date(p.date), { addSuffix: true })
        },
        { key: "bill_number", label: "Bill Number", sortable: true },
        { 
            key: "total_amount", 
            label: "Total Amount", 
            sortable: true,
            className: "text-right",
            render: (p: any) => formatINR(p.total_amount)
        },
        { 
            key: "amount_remaining", 
            label: "Remaining", 
            sortable: true,
            className: "text-right",
            render: (p: any) => (
                    <span className={`font-medium ${p.amount_remaining > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {formatINR(p.amount_remaining)}
                    </span>
            )
        },
        {
            key: "actions",
            label: "Actions",
            className: "text-right hidden sm:table-cell",
            render: (p: any) => (
                p.amount_remaining > 0 ? (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBillNumber(p.bill_number);
                            setPaymentFormOpen(true);
                        }}
                    >
                        <IndianRupee className="h-3.5 w-3.5 mr-1.5" /> Pay Bill
                    </Button>
                ) : (
                    <span className="text-sm text-green-600 font-medium px-2 inline-block mt-2">Fully Paid</span>
                )
            )
        }
    ];

    const paymentColumns = [
        {
            key: "date",
            label: "Date",
            sortable: true,
            className: "w-[120px]",
            render: (p: any) => format(new Date(p.date), "MMM d, yyyy")
        },
        { 
            key: "amount", 
            label: "Amount", 
            sortable: true,
            className: "text-right font-medium text-green-600",
            render: (p: any) => formatINR(p.amount)
        },
        { key: "bill_number", label: "Paid For Bill", render: (p: any) => p.bill_number || "—" },
        { key: "notes", label: "Notes", className: "hidden sm:table-cell text-muted-foreground truncate max-w-[200px]", render: (p: any) => p.notes || "—" },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 mt-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="hover:bg-muted/50 rounded-full h-10 w-10">
                        <Link to="/suppliers"><ChevronLeft className="h-5 w-5" /></Link>
                    </Button>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight truncate">{supplier.name}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleExport} className="gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" /> <span className="hidden sm:inline">Export Report</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setEditSupplierOpen(true)} className="h-9 w-9">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDeleteSupplier} className="h-9 w-9 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => { setSelectedBillNumber(undefined); setPaymentFormOpen(true); }} className="gap-2 gradient-btn text-white">
                        <IndianRupee className="h-4 w-4 text-white" /> Make Payment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Purchases</span>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">{formatINR(metrics?.totalPurchases || 0)}</span>
                </div>
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Paid</span>
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 break-words">{formatINR(metrics?.totalPayments || 0)}</span>
                </div>
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pending Amount</span>
                    <div className="flex flex-col min-w-0">
                        <span className={`text-xl sm:text-2xl lg:text-3xl font-bold break-words ${(metrics?.pendingAmount || 0) > 0 ? "text-warning" : "text-green-600"}`}>
                            {formatINR(metrics?.pendingAmount || 0)}
                        </span>
                        {metrics?.openingBalance ? <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Incl {formatINR(metrics.openingBalance)} opening</span> : null}
                    </div>
                    {(metrics?.pendingAmount || 0) > 0 && <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-warning/5 to-transparent pointer-events-none" />}
                </div>
                <div className="bg-card rounded-xl p-4 sm:p-5 soft-inset shadow-sm flex flex-col justify-center relative overflow-hidden transition-all hover:shadow-md">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Last Activity</span>
                    <span className="text-lg sm:text-xl font-bold mt-1 text-foreground break-words">
                        {metrics?.lastPayment 
                            ? formatDistanceToNowStrict(new Date(metrics.lastPayment), { addSuffix: true }) 
                            : "—"
                        }
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-semibold text-lg pb-1 text-muted-foreground">Supplier Details</h3>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-5 space-y-4 text-sm relative overflow-hidden transition-all hover:shadow-md">
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-primary" />
                            <a href={`tel:${supplier.phone}`} className="hover:underline font-medium text-foreground">{supplier.phone}</a>
                        </div>
                        {supplier.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-primary" />
                                <span className="text-foreground">{supplier.email}</span>
                            </div>
                        )}
                        {supplier.address && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                <span className="text-foreground">{supplier.address}</span>
                            </div>
                        )}
                        {supplier.gst_number && (
                            <div className="flex flex-col pt-3 mt-3 relative before:absolute before:top-0 before:left-0 before:h-[1px] before:w-full before:bg-border/30">
                                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">GSTIN</span>
                                <span className="font-medium text-foreground select-all">{supplier.gst_number}</span>
                            </div>
                        )}
                        {(supplier.bank_account_number || supplier.bank_name) && (
                            <div className="flex flex-col pt-3 mt-3 relative before:absolute before:top-0 before:left-0 before:h-[1px] before:w-full before:bg-border/30">
                                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1.5">Bank Details</span>
                                {supplier.bank_name && <span className="text-foreground">{supplier.bank_name} {supplier.branch_name ? `- ${supplier.branch_name}` : ''}</span>}
                                {supplier.bank_account_number && <span className="font-medium mt-1 text-foreground">A/C: <span className="select-all">{supplier.bank_account_number}</span></span>}
                                {supplier.ifsc_code && <span className="text-foreground">IFSC: <span className="select-all">{supplier.ifsc_code}</span></span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4 min-w-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2 pb-1 text-muted-foreground">
                        <History className="h-4 w-4" /> 
                        Bills & History
                    </h3>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5 overflow-hidden transition-all hover:shadow-md">
                        <DataTable 
                            data={billData} 
                            columns={columns} 
                            searchPlaceholder="Search bills..."
                            searchKey="bill_number"
                        />
                    </div>
                </div>

                <div className="md:col-span-3 space-y-4 min-w-0 mt-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2 pb-1 text-muted-foreground">
                        <History className="h-4 w-4" /> 
                        Payment History
                    </h3>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5 overflow-hidden transition-all hover:shadow-md">
                        <DataTable 
                            data={supplierPayments} 
                            columns={paymentColumns} 
                            searchPlaceholder="Search by bill number..."
                            searchKey="bill_number"
                            onEdit={(p) => {
                                setEditingPayment(p);
                                setPaymentFormOpen(true);
                            }}
                            onDelete={handleDeletePayment}
                        />
                    </div>
                </div>
            </div>

            <PaymentForm
                open={paymentFormOpen}
                onClose={() => { setPaymentFormOpen(false); setSelectedBillNumber(undefined); setEditingPayment(null); }}
                onSave={handleSavePayment}
                suppliers={[supplier]}
                defaultSupplier={supplier.name}
                purchases={purchases}
                defaultBillNumber={selectedBillNumber}
                initial={editingPayment}
            />
            <SupplierForm
                open={editSupplierOpen}
                onClose={() => setEditSupplierOpen(false)}
                onSave={handleEditSupplier}
                initial={supplier}
            />
        </div>
    );
}
