import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown } from "lucide-react";
import type { Purchase, Sale } from "@/types";

export default function Dashboard() {
  const [purchases] = useLocalStorage<Purchase[]>("purchases", []);
  const [sales] = useLocalStorage<Sale[]>("sales", []);

  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const profitLoss = totalSales - totalPurchases;

  const cards = [
    {
      title: "Total Purchases",
      value: totalPurchases,
      icon: ShoppingCart,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Total Sales",
      value: totalSales,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: profitLoss >= 0 ? "Profit" : "Loss",
      value: Math.abs(profitLoss),
      icon: profitLoss >= 0 ? TrendingUp : TrendingDown,
      color: profitLoss >= 0 ? "text-success" : "text-destructive",
      bg: profitLoss >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <div className={`rounded-md p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">
              ${card.value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Purchase Entries</h3>
          <p className="text-3xl font-bold text-card-foreground">{purchases.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Sale Entries</h3>
          <p className="text-3xl font-bold text-card-foreground">{sales.length}</p>
        </div>
      </div>
    </div>
  );
}
