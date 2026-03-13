import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  List,
  GitCompareArrows,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  Shield,
  FileText,
  Users,
  Database,
  Briefcase,
  Zap
} from "lucide-react";

type NavGroup = 'OVERVIEW' | 'DATABASE' | 'ENGINE' | 'ACCOUNTS';

export function SidebarContent() {
  const { user, signOut } = useAuth();
  const [activeGroup, setActiveGroup] = useState<NavGroup>('OVERVIEW');

  const groups = [
    { id: 'OVERVIEW', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'DATABASE', icon: Database, label: 'Data Explorer' },
    { id: 'ENGINE', icon: Zap, label: 'Recon Engine' },
    { id: 'ACCOUNTS', icon: Briefcase, label: 'Finances' },
  ] as const;

  const adminNavMapping: Record<NavGroup, any[]> = {
    OVERVIEW: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/audit", label: "Audit Trail", icon: ClipboardList },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
    DATABASE: [
      { to: "/upload", label: "Upload Data", icon: Upload },
      { to: "/transactions", label: "Transactions", icon: List },
    ],
    ENGINE: [
      { to: "/reconcile", label: "Reconcile", icon: GitCompareArrows },
      { to: "/review", label: "Review", icon: CheckCircle2 },
      { to: "/exceptions", label: "Exception Log", icon: AlertCircle },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
    ACCOUNTS: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/invoices", label: "Invoices", icon: FileText },
    ]
  };

  const navItems = adminNavMapping[activeGroup];

  return (
    <div className="flex h-full bg-white overflow-hidden shadow-2xl">
      {/* Column 1: Slim Icon Bar (Atlas Style) */}
      <div className="w-[64px] bg-[#001e2b] flex flex-col items-center py-6 gap-6 z-20">
        <div className="mb-4">
          <Shield className="h-8 w-8 text-[#00ed64]" />
        </div>
        
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(g.id)}
            className={`p-2.5 rounded-xl transition-all duration-200 group relative ${
              activeGroup === g.id ? "bg-[#00ed64]/10 text-[#00ed64]" : "text-slate-400 hover:text-white"
            }`}
          >
            <g.icon className="h-5.5 w-5.5" />
            {activeGroup === g.id && (
               <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00ed64] rounded-r-full" />
            )}
            {/* Tooltip on hover */}
            <div className="absolute left-16 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-bold uppercase tracking-widest z-50">
              {g.label}
            </div>
          </button>
        ))}

        <div className="mt-auto flex flex-col gap-4 pb-4">
          <button 
            onClick={signOut}
            className="p-3 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Column 2: Wide Navigation Bar */}
      <div className="flex-1 bg-[#f9fbfa] flex flex-col border-r border-slate-200">
        <div className="px-6 py-8">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
             Organization
           </p>
           <div className="flex items-center gap-2 mb-8">
             <div className="h-8 w-8 rounded bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shadow-inner">
               {user?.email?.[0].toUpperCase()}
             </div>
             <div className="truncate">
               <p className="text-sm font-bold text-[#001e2b] truncate">{user?.email?.split('@')[0]}</p>
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider italic">Primary Cluster</p>
             </div>
           </div>

           <h2 className="text-xl font-black text-[#001e2b] mb-6">
             {groups.find(g => g.id === activeGroup)?.label}
           </h2>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 text-slate-600 hover:bg-slate-200/50 hover:text-[#00684a]"
              activeClassName="bg-[#00684a]/10 text-[#00684a] shadow-sm relative overflow-hidden"
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 bg-white/50 border-t border-slate-200 mt-auto">
           <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <span>System Status</span>
             <div className="flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
               <span className="text-success">Active</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function AppSidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-[320px] flex-col z-20 sticky top-0">
      <SidebarContent />
    </aside>
  );
}
