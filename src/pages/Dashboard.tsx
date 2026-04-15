import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, startOfMonth, subDays, subMonths } from "date-fns";
import { BarChart3, TrendingUp, TrendingDown, Users, Truck, ArrowUpRight, ArrowDownRight, LayoutDashboard, Calendar } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: subMonths(new Date(), 1),
    to: new Date()
  }));

  const filteredSales = useMemo(() => sales.filter((sale) => {
    if (!dateRange?.from) return true;
    const saleDate = new Date(sale.date);
    if (!dateRange.to) return isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
    return isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
  }), [sales, dateRange]);

  const filteredPurchases = useMemo(() => purchases.filter((purchase) => {
    if (!dateRange?.from) return true;
    const purchaseDate = new Date(purchase.date);
    if (!dateRange.to) return isWithinInterval(purchaseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
    return isWithinInterval(purchaseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
  }), [purchases, dateRange]);

  const totalSales = filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalPurchases = filteredPurchases.reduce((acc, curr) => acc + curr.total_amount, 0);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const interval = eachDayOfInterval({
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to)
    });

    return interval.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const daySales = filteredSales.filter(s => format(new Date(s.date), "yyyy-MM-dd") === dayStr);
      const dayPurchases = filteredPurchases.filter(p => format(new Date(p.date), "yyyy-MM-dd") === dayStr);

      return {
        date: format(day, "MMM dd"),
        fullDate: dayStr,
        Sales: daySales.reduce((sum, s) => sum + s.total_amount, 0),
        Purchases: dayPurchases.reduce((sum, p) => sum + p.total_amount, 0),
      };
    });
  }, [filteredSales, filteredPurchases, dateRange]);

  const stats = [
    {
      title: "Gross Sales",
      value: formatINR(totalSales),
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      description: `${filteredSales.length} invoices generated`,
      path: "/sales",
    },
    {
      title: "Purchases",
      value: formatINR(totalPurchases),
      icon: TrendingDown,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      description: `${filteredPurchases.length} bills recorded`,
      path: "/purchases",
    },
    {
      title: "Customers",
      value: customers.length.toString(),
      icon: Users,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      description: "Potential receivables",
      path: "/customers",
    },
    {
      title: "Suppliers",
      value: suppliers.length.toString(),
      icon: Truck,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Payable accounts",
      path: "/suppliers",
    },
  ];

  if (loadingSales || loadingPurchases) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">Crunching your numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Real-time business performance overview.</p>
        </div>
        <div className="bg-card soft-inset rounded-lg p-0.5 shadow-sm">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            onClick={() => navigate(stat.path)}
            className="group relative rounded-2xl border bg-card p-6 shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-20 blur-2xl transition-all group-hover:opacity-40 ${stat.bgColor}`} />
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all font-bold" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{stat.title}</p>
            <div className="text-2xl font-black mt-1 text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-medium">
              <Calendar className="h-3 w-3" />
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-2xl border bg-card p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Overview</h3>
              <p className="text-xs text-muted-foreground font-medium">Sales vs Purchases trend</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Sales
              </div>
              <div className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Purchases
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full mt-2 group">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  tick={{fill: '#6B7280'}} 
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  tick={{fill: '#6B7280'}}
                  tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: any) => formatINR(value)}
                />
                <Area 
                  type="monotone" 
                  dataKey="Sales" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Purchases" 
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPurchases)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="lg:col-span-3 rounded-2xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight">Recent Sales</h3>
            <button 
              onClick={() => navigate("/sales")}
              className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
            >
              View All
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {filteredSales.slice(0, 7).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {sale.customer_name.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold leading-none flex items-center gap-1.5">
                      {sale.customer_name}
                      <ArrowUpRight className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{sale.bill_number}</p>
                  </div>
                </div>
                <div className="text-sm font-black text-foreground">{formatINR(sale.total_amount)}</div>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 border-2 border-dashed rounded-xl py-12">
                <LayoutDashboard className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No sales in this period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
