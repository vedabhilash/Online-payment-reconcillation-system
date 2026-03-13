import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar, { SidebarContent } from "@/components/AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#f0f2f1]">
      {/* Mobile Header */}
      <header className="flex lg:hidden items-center justify-between px-6 py-4 border-b bg-sidebar text-sidebar-foreground sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">ReconPay</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-sidebar border-r-sidebar-border">
            <SidebarContent isMobile={true} />
          </SheetContent>
        </Sheet>
      </header>

      <AppSidebar />
      
      <main className="flex-1 overflow-auto bg-transparent p-4 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
