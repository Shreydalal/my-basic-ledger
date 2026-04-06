import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ChevronLeft, IndianRupee, Loader2, Download, History, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PaymentForm } from "@/components/PaymentForm";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR, exportToCSV } from "@/lib/csv";
import type { Supplier, Purchase, Payment } from "@/types";

export default function SupplierDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { data: suppliers, loading: loadingSuppliers } = useSupabase<Supplier>("suppliers");
    const { data: purchases, loading: loadingPurchases } = useSupabase<Purchase>("purchases");
    const { data: payments, loading: loadingPayments, add: addPayment, update: updatePayment, remove: removePayment } = useSupabase<Payment>("payments");

    const [paymentFormOpen, setPaymentFormOpen] = useState(false);
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
        const exportData = billData.map(b => ({
            date: format(new Date(b.date), "yyyy-MM-dd"),
            bill_number: b.bill_number,
            total_amount: b.total_amount,
            amount_paid: b.amount_paid,
            amount_remaining: b.amount_remaining,
            notes: b.notes || ""
        }));
        exportToCSV(exportData, `${supplier.name}_bills`, [
            { key: "date", label: "Date" },
            { key: "bill_number", label: "Bill Number" },
            { key: "total_amount", label: "Total Amount" },
            { key: "amount_paid", label: "Paid" },
            { key: "amount_remaining", label: "Remaining" },
            { key: "notes", label: "Notes" }
        ]);
    };

    if (loadingSuppliers || loadingPurchases || loadingPayments) {
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
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild className="-ml-2 hover:bg-transparent">
                        <Link to="/suppliers"><ChevronLeft className="h-6 w-6" /></Link>
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{supplier.name}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport} className="gap-2">
                        <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    <Button onClick={() => { setSelectedBillNumber(undefined); setPaymentFormOpen(true); }} className="gap-2">
                        <IndianRupee className="h-4 w-4" /> Make Payment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-medium text-muted-foreground">Total Purchases</span>
                    <span className="text-2xl font-bold">{formatINR(metrics?.totalPurchases || 0)}</span>
                </div>
                <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-medium text-muted-foreground">Total Paid</span>
                    <span className="text-2xl font-bold text-green-600">{formatINR(metrics?.totalPayments || 0)}</span>
                </div>
                <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-medium text-muted-foreground">Pending Amount</span>
                    <div className="flex flex-col">
                        <span className={`text-2xl font-bold ${(metrics?.pendingAmount || 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                            {formatINR(metrics?.pendingAmount || 0)}
                        </span>
                        {metrics?.openingBalance ? <span className="text-xs text-muted-foreground">Incl {formatINR(metrics.openingBalance)} opening</span> : null}
                    </div>
                </div>
                <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                    <span className="text-sm font-medium text-muted-foreground">Last Activity</span>
                    <span className="text-xl font-bold mt-1">
                        {metrics?.lastPayment 
                            ? formatDistanceToNowStrict(new Date(metrics.lastPayment), { addSuffix: true }) 
                            : "—"
                        }
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Supplier Details</h3>
                    <div className="bg-card border rounded-lg shadow-sm p-4 space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${supplier.phone}`} className="hover:underline font-medium">{supplier.phone}</a>
                        </div>
                        {supplier.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{supplier.email}</span>
                            </div>
                        )}
                        {supplier.address && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span>{supplier.address}</span>
                            </div>
                        )}
                        {supplier.gst_number && (
                            <div className="flex flex-col pt-2 border-t mt-2">
                                <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">GSTIN</span>
                                <span className="font-medium mt-0.5 select-all">{supplier.gst_number}</span>
                            </div>
                        )}
                        {(supplier.bank_account_number || supplier.bank_name) && (
                            <div className="flex flex-col pt-2 border-t mt-2">
                                <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider mb-1">Bank Details</span>
                                {supplier.bank_name && <span>{supplier.bank_name} {supplier.branch_name ? `- ${supplier.branch_name}` : ''}</span>}
                                {supplier.bank_account_number && <span className="font-medium mt-1">A/C: <span className="select-all">{supplier.bank_account_number}</span></span>}
                                {supplier.ifsc_code && <span>IFSC: <span className="select-all">{supplier.ifsc_code}</span></span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4 min-w-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                        <History className="h-5 w-5 text-muted-foreground" /> 
                        Bills & History
                    </h3>
                    <div className="bg-card border rounded-lg shadow-sm p-4 sm:p-5 overflow-hidden">
                        <DataTable 
                            data={billData} 
                            columns={columns} 
                            searchPlaceholder="Search bills..."
                            searchKey="bill_number"
                        />
                    </div>
                </div>

                <div className="md:col-span-3 space-y-4 min-w-0 mt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                        <History className="h-5 w-5 text-muted-foreground" /> 
                        Payment History
                    </h3>
                    <div className="bg-card border rounded-lg shadow-sm p-4 sm:p-5 overflow-hidden">
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
        </div>
    );
}
