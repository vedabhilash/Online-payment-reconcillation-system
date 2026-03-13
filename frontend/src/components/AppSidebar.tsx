import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Upload,
  List,
  GitCompareArrows,
  CheckCircle2,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  Shield,
  BookOpen,
  FileText,
  Users
} from "lucide-react";

const adminNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Data", icon: Upload },
  { to: "/transactions", label: "Transactions", icon: List },
  { to: "/reconcile", label: "Reconcile", icon: GitCompareArrows },
  { to: "/review", label: "Review", icon: CheckCircle2 },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/audit", label: "Audit Trail", icon: ClipboardList },
  { to: "/settings", label: "Settings", icon: Settings },
];

const customerNavItems = [
  { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customer/invoices", label: "My Invoices", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function SidebarContent() {
  const { user, signOut } = useAuth();
  const navItems = user?.role === 'CUSTOMER' ? customerNavItems : adminNavItems;

  return (
    <div className="flex h-full flex-col bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground">
      <div className="flex items-center gap-3 px-8 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="font-sans text-xl font-bold tracking-tight text-white">ReconPay</span>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:translate-x-1"
            activeClassName="bg-white/10 text-white shadow-sm"
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-6 bg-black/20">
        <div className="mb-4 px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider truncate">{user?.email}</div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-4 rounded-xl px-4 py-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span className="font-semibold">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}

export default function AppSidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-72 flex-col border-r border-sidebar-border shadow-2xl z-20 sticky top-0">
      <SidebarContent />
    </aside>
  );
}
