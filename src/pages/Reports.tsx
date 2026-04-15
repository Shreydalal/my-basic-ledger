import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Loader2, FileText, Download, TrendingDown, TrendingUp, Users, Truck } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSupabase } from "@/hooks/useSupabase";
import { formatINR } from "@/lib/csv";
import { exportToPDF } from "@/lib/pdf";
import type { Purchase, Sale, Customer, Supplier, Receipt, Payment } from "@/types";

// ─── Helper ───────────────────────────────────────────────────────────────────
function filterByDate<T extends { date: string }>(items: T[], range: DateRange | undefined): T[] {
    if (!range?.from) return items;
    return items.filter((item) => {
        const d = new Date(item.date);
        if (!range.to) return isWithinInterval(d, { start: startOfDay(range.from!), end: endOfDay(range.from!) });
        return isWithinInterval(d, { start: startOfDay(range.from!), end: endOfDay(range.to) });
    });
}

// ─── Shared section header ────────────────────────────────────────────────────
function ReportHeader({
    icon: Icon,
    title,
    description,
    dateRange,
    setDateRange,
    onExport,
    disabled,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    dateRange: DateRange | undefined;
    setDateRange: (d: DateRange | undefined) => void;
    onExport: () => void;
    disabled: boolean;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <div className="bg-card soft-inset rounded-lg p-0.5">
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                </div>
                <Button variant="ghost" size="sm" onClick={onExport} className="gap-1.5" disabled={disabled}>
                    <Download className="h-4 w-4 text-muted-foreground" /> Export PDF
                </Button>
            </div>
        </div>
    );
}

// ─── Summary metric card ──────────────────────────────────────────────────────
function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="bg-card rounded-xl p-4 soft-inset shadow-sm flex flex-col gap-0.5">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground break-words">{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
    );
}

// ─── Main Reports page ────────────────────────────────────────────────────────
export default function Reports() {
    const { data: purchases, loading: loadingPurchases } = useSupabase<Purchase>("purchases");
    const { data: sales, loading: loadingSales } = useSupabase<Sale>("sales");
    const { data: customers, loading: loadingCustomers } = useSupabase<Customer>("customers");
    const { data: suppliers, loading: loadingSuppliers } = useSupabase<Supplier>("suppliers");
    const { data: receipts } = useSupabase<Receipt>("receipts");
    const { data: payments } = useSupabase<Payment>("payments");

    const [purchaseDateRange, setPurchaseDateRange] = useState<DateRange | undefined>();
    const [salesDateRange, setSalesDateRange] = useState<DateRange | undefined>();
    const [customerDateRange, setCustomerDateRange] = useState<DateRange | undefined>();
    const [supplierDateRange, setSupplierDateRange] = useState<DateRange | undefined>();

    // ── Purchase Report ──────────────────────────────────────────────────────
    const validPurchases = useMemo(() =>
        purchases.filter((p) => !/k/i.test(String(p.bill_number || ""))),
        [purchases]
    );

    const filteredPurchases = useMemo(() => filterByDate(validPurchases, purchaseDateRange), [validPurchases, purchaseDateRange]);

    const purchaseReportData = useMemo(() =>
        filteredPurchases.map((p) => {
            const supplier = suppliers.find((s) => s.name === p.supplier_name);
            return { ...p, supplier_gst: supplier?.gst_number || "—" };
        }),
        [filteredPurchases, suppliers]
    );

    const totalPurchaseAmount = useMemo(() =>
        purchaseReportData.reduce((sum, p) => sum + p.total_amount, 0),
        [purchaseReportData]
    );

    const handleExportPurchases = () => {
        exportToPDF({
            title: "Navkar Hosiery - Purchase Report",
            subtitle: "Analytics of valid inbound goods and invoices.",
            filename: "purchase_report",
            data: purchaseReportData.map((p) => ({
                date: format(new Date(p.date), "yyyy-MM-dd"),
                bill_number: p.bill_number,
                supplier_name: p.supplier_name,
                supplier_gst: p.supplier_gst,
                total_amount: formatINR(p.total_amount),
            })),
            columns: [
                { key: "date", label: "Date" },
                { key: "bill_number", label: "Bill No" },
                { key: "supplier_name", label: "Supplier" },
                { key: "supplier_gst", label: "GST No" },
                { key: "total_amount", label: "Amount" },
            ],
            metrics: [
                { label: "Total Purchase Amount", value: formatINR(totalPurchaseAmount) },
                { label: "Valid Bills Considered", value: purchaseReportData.length.toString() },
            ],
        });
    };

    // ── Sales Report ─────────────────────────────────────────────────────────
    const filteredSales = useMemo(() => filterByDate(sales, salesDateRange), [sales, salesDateRange]);

    const totalSalesAmount = useMemo(() =>
        filteredSales.reduce((sum, s) => sum + s.total_amount, 0),
        [filteredSales]
    );

    const handleExportSales = () => {
        exportToPDF({
            title: "Navkar Enterprise - Sales Report",
            subtitle: "Log of all outward dispatch invoices.",
            filename: "sales_report",
            data: filteredSales.map((s) => ({
                date: format(new Date(s.date), "yyyy-MM-dd"),
                bill_number: s.bill_number,
                customer_name: s.customer_name,
                total_amount: formatINR(s.total_amount),
                notes: s.notes || "—",
            })),
            columns: [
                { key: "date", label: "Date" },
                { key: "bill_number", label: "Bill No" },
                { key: "customer_name", label: "Customer" },
                { key: "total_amount", label: "Amount" },
                { key: "notes", label: "Notes" },
            ],
            metrics: [
                { label: "Total Sales Amount", value: formatINR(totalSalesAmount) },
                { label: "Total Invoices", value: filteredSales.length.toString() },
            ],
        });
    };

    // ── Customers (Receivables) ───────────────────────────────────────────────
    const customerReportData = useMemo(() => {
        return customers.map((c) => {
            const customerSales = filterByDate(
                sales.filter((s) => s.customer_name === c.name),
                customerDateRange
            );
            const customerReceipts = filterByDate(
                receipts.filter((r) => r.customer_name === c.name),
                customerDateRange
            );
            const totalSales = customerSales.reduce((sum, s) => sum + s.total_amount, 0);
            const totalReceipts = customerReceipts.reduce((sum, r) => sum + r.amount, 0);
            const pending = (c.opening_balance || 0) + totalSales - totalReceipts;
            return {
                ...c,
                total_sales: totalSales,
                total_received: totalReceipts,
                pending,
                bills: customerSales.length,
            };
        }).filter((c) => c.total_sales > 0 || c.pending !== 0 || !customerDateRange?.from);
    }, [customers, sales, receipts, customerDateRange]);

    const totalReceivable = useMemo(() =>
        customerReportData.reduce((sum, c) => sum + c.pending, 0),
        [customerReportData]
    );

    const handleExportCustomers = () => {
        exportToPDF({
            title: "Navkar Enterprise - Customers Report",
            subtitle: "Accounts receivable — outstanding balances per customer.",
            filename: "customers_report",
            data: customerReportData.map((c) => ({
                name: c.name,
                phone: c.phone || "—",
                total_sales: formatINR(c.total_sales),
                total_received: formatINR(c.total_received),
                pending: formatINR(c.pending),
            })),
            columns: [
                { key: "name", label: "Customer" },
                { key: "phone", label: "Phone" },
                { key: "total_sales", label: "Total Sales" },
                { key: "total_received", label: "Received" },
                { key: "pending", label: "Outstanding" },
            ],
            metrics: [
                { label: "Total Receivable", value: formatINR(totalReceivable) },
                { label: "Total Customers", value: customerReportData.length.toString() },
            ],
        });
    };

    // ── Suppliers (Payables) ─────────────────────────────────────────────────
    const supplierReportData = useMemo(() => {
        return suppliers.map((s) => {
            const supplierPurchases = filterByDate(
                purchases.filter((p) => p.supplier_name === s.name),
                supplierDateRange
            );
            const supplierPayments = filterByDate(
                payments.filter((p) => p.supplier_name === s.name),
                supplierDateRange
            );
            const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.total_amount, 0);
            const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
            const pending = (s.opening_balance || 0) + totalPurchases - totalPaid;
            return {
                ...s,
                total_purchases: totalPurchases,
                total_paid: totalPaid,
                pending,
                bills: supplierPurchases.length,
            };
        }).filter((s) => s.total_purchases > 0 || s.pending !== 0 || !supplierDateRange?.from);
    }, [suppliers, purchases, payments, supplierDateRange]);

    const totalPayable = useMemo(() =>
        supplierReportData.reduce((sum, s) => sum + s.pending, 0),
        [supplierReportData]
    );

    const handleExportSuppliers = () => {
        exportToPDF({
            title: "Navkar Enterprise - Suppliers Report",
            subtitle: "Accounts payable — outstanding balances per supplier.",
            filename: "suppliers_report",
            data: supplierReportData.map((s) => ({
                name: s.name,
                gst_number: s.gst_number || "—",
                total_purchases: formatINR(s.total_purchases),
                total_paid: formatINR(s.total_paid),
                pending: formatINR(s.pending),
            })),
            columns: [
                { key: "name", label: "Supplier" },
                { key: "gst_number", label: "GST No" },
                { key: "total_purchases", label: "Total Purchases" },
                { key: "total_paid", label: "Paid" },
                { key: "pending", label: "Outstanding" },
            ],
            metrics: [
                { label: "Total Payable", value: formatINR(totalPayable) },
                { label: "Total Suppliers", value: supplierReportData.length.toString() },
            ],
        });
    };

    const isLoading = loadingPurchases || loadingSales || loadingCustomers || loadingSuppliers;

    if (isLoading && purchases.length === 0 && sales.length === 0) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Reports</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-0.5">View, filter and export all business reports.</p>
                </div>
            </div>

            <Tabs defaultValue="purchases" className="w-full">
                <TabsList className="mb-6 h-auto flex-wrap gap-1 bg-muted/60 p-1">
                    <TabsTrigger value="purchases" className="gap-2 data-[state=active]:bg-background">
                        <TrendingDown className="h-4 w-4" /> Purchases
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="gap-2 data-[state=active]:bg-background">
                        <TrendingUp className="h-4 w-4" /> Sales
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="gap-2 data-[state=active]:bg-background">
                        <Users className="h-4 w-4" /> Customers
                    </TabsTrigger>
                    <TabsTrigger value="suppliers" className="gap-2 data-[state=active]:bg-background">
                        <Truck className="h-4 w-4" /> Suppliers
                    </TabsTrigger>
                </TabsList>

                {/* ── Purchase Report ── */}
                <TabsContent value="purchases" className="space-y-6">
                    <ReportHeader
                        icon={TrendingDown}
                        title="Purchase Report"
                        description="Valid inbound goods and invoices (bills with 'K' excluded)."
                        dateRange={purchaseDateRange}
                        setDateRange={setPurchaseDateRange}
                        onExport={handleExportPurchases}
                        disabled={purchaseReportData.length === 0}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <MetricCard label="Total Amount" value={formatINR(totalPurchaseAmount)} />
                        <MetricCard label="Valid Bills" value={purchaseReportData.length.toString()} />
                        <MetricCard
                            label="Excluded Bills"
                            value={(purchases.length - validPurchases.length).toString()}
                            sub="Bills with 'K'"
                        />
                    </div>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5">
                        <DataTable
                            data={purchaseReportData}
                            columns={[
                                { key: "date", label: "Date", sortable: true, render: (p: any) => format(new Date(p.date), "MMM d, yyyy") },
                                { key: "bill_number", label: "Bill No", sortable: true },
                                { key: "supplier_name", label: "Supplier", sortable: true },
                                { key: "supplier_gst", label: "GST No" },
                                { key: "total_amount", label: "Amount", sortable: true, className: "text-right", render: (p: any) => formatINR(p.total_amount) },
                            ]}
                            searchPlaceholder="Search by supplier..."
                            searchKey="supplier_name"
                        />
                    </div>
                </TabsContent>

                {/* ── Sales Report ── */}
                <TabsContent value="sales" className="space-y-6">
                    <ReportHeader
                        icon={TrendingUp}
                        title="Sales Report"
                        description="All outward dispatch invoices and customer billing."
                        dateRange={salesDateRange}
                        setDateRange={setSalesDateRange}
                        onExport={handleExportSales}
                        disabled={filteredSales.length === 0}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <MetricCard label="Total Sales" value={formatINR(totalSalesAmount)} />
                        <MetricCard label="Total Invoices" value={filteredSales.length.toString()} />
                        <MetricCard
                            label="Avg Invoice"
                            value={filteredSales.length > 0 ? formatINR(totalSalesAmount / filteredSales.length) : "—"}
                        />
                    </div>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5">
                        <DataTable
                            data={filteredSales}
                            columns={[
                                { key: "date", label: "Date", sortable: true, render: (s: any) => format(new Date(s.date), "MMM d, yyyy") },
                                { key: "bill_number", label: "Bill No", sortable: true },
                                { key: "customer_name", label: "Customer", sortable: true },
                                { key: "total_amount", label: "Amount", sortable: true, className: "text-right", render: (s: any) => formatINR(s.total_amount) },
                                { key: "notes", label: "Notes", className: "hidden md:table-cell text-muted-foreground", render: (s: any) => s.notes || "—" },
                            ]}
                            searchPlaceholder="Search by customer..."
                            searchKey="customer_name"
                        />
                    </div>
                </TabsContent>

                {/* ── Customers (Receivables) ── */}
                <TabsContent value="customers" className="space-y-6">
                    <ReportHeader
                        icon={Users}
                        title="Customers Report"
                        description="Accounts receivable — outstanding balances per customer."
                        dateRange={customerDateRange}
                        setDateRange={setCustomerDateRange}
                        onExport={handleExportCustomers}
                        disabled={customerReportData.length === 0}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <MetricCard label="Total Receivable" value={formatINR(totalReceivable)} />
                        <MetricCard label="Total Customers" value={customerReportData.length.toString()} />
                        <MetricCard
                            label="Customers Pending"
                            value={customerReportData.filter((c) => c.pending > 0).length.toString()}
                            sub="With outstanding balance"
                        />
                    </div>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5">
                        <DataTable
                            data={customerReportData}
                            columns={[
                                { key: "name", label: "Customer", sortable: true },
                                { key: "phone", label: "Phone", className: "hidden sm:table-cell" },
                                { key: "bills", label: "Bills", className: "text-center", render: (c: any) => c.bills },
                                { key: "total_sales", label: "Total Sales", sortable: true, className: "text-right", render: (c: any) => formatINR(c.total_sales) },
                                { key: "total_received", label: "Received", sortable: true, className: "text-right text-green-600", render: (c: any) => formatINR(c.total_received) },
                                {
                                    key: "pending",
                                    label: "Outstanding",
                                    sortable: true,
                                    className: "text-right font-semibold",
                                    render: (c: any) => (
                                        <span className={c.pending > 0 ? "text-warning" : "text-green-600"}>
                                            {formatINR(c.pending)}
                                        </span>
                                    ),
                                },
                            ]}
                            searchPlaceholder="Search by customer..."
                            searchKey="name"
                        />
                    </div>
                </TabsContent>

                {/* ── Suppliers (Payables) ── */}
                <TabsContent value="suppliers" className="space-y-6">
                    <ReportHeader
                        icon={Truck}
                        title="Suppliers Report"
                        description="Accounts payable — outstanding balances per supplier."
                        dateRange={supplierDateRange}
                        setDateRange={setSupplierDateRange}
                        onExport={handleExportSuppliers}
                        disabled={supplierReportData.length === 0}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <MetricCard label="Total Payable" value={formatINR(totalPayable)} />
                        <MetricCard label="Total Suppliers" value={supplierReportData.length.toString()} />
                        <MetricCard
                            label="Suppliers Pending"
                            value={supplierReportData.filter((s) => s.pending > 0).length.toString()}
                            sub="With outstanding balance"
                        />
                    </div>
                    <div className="bg-card rounded-xl soft-inset shadow-sm p-4 sm:p-5">
                        <DataTable
                            data={supplierReportData}
                            columns={[
                                { key: "name", label: "Supplier", sortable: true },
                                { key: "gst_number", label: "GST No", className: "hidden sm:table-cell", render: (s: any) => s.gst_number || "—" },
                                { key: "bills", label: "Bills", className: "text-center", render: (s: any) => s.bills },
                                { key: "total_purchases", label: "Total Purchases", sortable: true, className: "text-right", render: (s: any) => formatINR(s.total_purchases) },
                                { key: "total_paid", label: "Paid", sortable: true, className: "text-right text-green-600", render: (s: any) => formatINR(s.total_paid) },
                                {
                                    key: "pending",
                                    label: "Outstanding",
                                    sortable: true,
                                    className: "text-right font-semibold",
                                    render: (s: any) => (
                                        <span className={s.pending > 0 ? "text-warning" : "text-green-600"}>
                                            {formatINR(s.pending)}
                                        </span>
                                    ),
                                },
                            ]}
                            searchPlaceholder="Search by supplier..."
                            searchKey="name"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
