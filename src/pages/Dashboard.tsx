import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { BarChart3, TrendingUp, TrendingDown, Users, Truck } from "lucide-react";
import { DateRange } from "react-day-picker";
import { formatINR } from "@/lib/csv";
import { useSupabase } from "@/hooks/useSupabase";
import { DateRangePicker } from "@/components/DateRangePicker";
import type { Sale, Purchase, Customer, Supplier } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: sales, loading: loadingSales } = useSupabase<Sale>("sales");
  const { data: purchases, loading: loadingPurchases } = useSupabase<Purchase>("purchases");
  const { data: customers } = useSupabase<Customer>("customers");
  const { data: suppliers } = useSupabase<Supplier>("suppliers");

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredSales = sales.filter((sale) => {
    if (!dateRange?.from) return true;
    const saleDate = new Date(sale.date);
    if (!dateRange.to) return isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
    return isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
  });

  const filteredPurchases = purchases.filter((purchase) => {
    if (!dateRange?.from) return true;
    const purchaseDate = new Date(purchase.date);
    if (!dateRange.to) return isWithinInterval(purchaseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
    return isWithinInterval(purchaseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
  });

  const totalSales = filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalPurchases = filteredPurchases.reduce((acc, curr) => acc + curr.total_amount, 0);

  const stats = [
    {
      title: "Total Sales",
      value: formatINR(totalSales),
      icon: TrendingUp,
      color: "text-green-500",
      description: `${filteredSales.length} transactions`,
      path: "/sales",
    },
    {
      title: "Total Purchases",
      value: formatINR(totalPurchases),
      icon: TrendingDown,
      color: "text-red-500",
      description: `${filteredPurchases.length} transactions`,
      path: "/purchases",
    },
    {
      title: "Customers",
      value: customers.length.toString(),
      icon: Users,
      color: "text-blue-500",
      description: "Active customers",
      path: "/customers",
    },
    {
      title: "Suppliers",
      value: suppliers.length.toString(),
      icon: Truck,
      color: "text-orange-500",
      description: "Active suppliers",
      path: "/suppliers",
    },
  ];

  if (loadingSales || loadingPurchases) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            onClick={() => navigate(stat.path)}
            className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight">{stat.title}</h3>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Overview</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Chart visualization coming soon
          </div>
        </div>
        <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium">Recent Sales</h3>
          <div className="space-y-4">
            {filteredSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{sale.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{sale.bill_number}</p>
                </div>
                <div className="font-medium">{formatINR(sale.total_amount)}</div>
              </div>
            ))}
            {filteredSales.length === 0 && <p className="text-sm text-muted-foreground">No recent sales</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
