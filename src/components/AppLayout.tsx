import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, ShoppingCart, DollarSign, Truck, Users, Menu, X, BookOpen } from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Purchases", url: "/purchases", icon: ShoppingCart },
  { title: "Sales", url: "/sales", icon: DollarSign },
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Customers", url: "/customers", icon: Users },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-sidebar text-sidebar-foreground transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <BookOpen className="h-5 w-5 text-sidebar-primary" />
          <span className="text-lg font-semibold text-sidebar-accent-foreground">BookKeep</span>
        </div>
        <nav className="mt-2 flex flex-col gap-0.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="text-lg font-semibold text-foreground md:hidden">BookKeep</h1>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
