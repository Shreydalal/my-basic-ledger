import { BarChart3, TrendingUp, TrendingDown, Users, Truck } from "lucide-react";
import { formatINR } from "@/lib/csv";
import { useSupabase } from "@/hooks/useSupabase";
import type { Sale, Purchase, Customer, Supplier } from "@/types";

export default function Dashboard() {
  const { data: sales, loading: loadingSales } = useSupabase<Sale>("sales");
  const { data: purchases, loading: loadingPurchases } = useSupabase<Purchase>("purchases");
  const { data: customers } = useSupabase<Customer>("customers");
  const { data: suppliers } = useSupabase<Supplier>("suppliers");

  const totalSales = sales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalPurchases = purchases.reduce((acc, curr) => acc + curr.total_amount, 0);

  const stats = [
    {
      title: "Total Sales",
      value: formatINR(totalSales),
      icon: TrendingUp,
      color: "text-green-500",
      description: `${sales.length} transactions`,
    },
    {
      title: "Total Purchases",
      value: formatINR(totalPurchases),
      icon: TrendingDown,
      color: "text-red-500",
      description: `${purchases.length} transactions`,
    },
    {
      title: "Customers",
      value: customers.length.toString(),
      icon: Users,
      color: "text-blue-500",
      description: "Active customers",
    },
    {
      title: "Suppliers",
      value: suppliers.length.toString(),
      icon: Truck,
      color: "text-orange-500",
      description: "Active suppliers",
    },
  ];

  if (loadingSales || loadingPurchases) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
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
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{sale.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{sale.bill_number}</p>
                </div>
                <div className="font-medium">{formatINR(sale.total_amount)}</div>
              </div>
            ))}
            {sales.length === 0 && <p className="text-sm text-muted-foreground">No recent sales</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
