import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Upload from "@/pages/Upload";
import Transactions from "@/pages/Transactions";
import Reconcile from "@/pages/Reconcile";
import Review from "@/pages/Review";
import Reports from "@/pages/Reports";
import SessionReport from "@/pages/SessionReport";
import Exceptions from "@/pages/Exceptions";
import Audit from "@/pages/Audit";
import SettingsPage from "@/pages/SettingsPage";
import Customers from "@/pages/Customers";
import Invoices from "@/pages/Invoices";
import CustomerInvoices from "@/pages/CustomerInvoices";
import CustomerDashboard from "@/pages/CustomerDashboard";
import NotFound from "./pages/NotFound";
import RoleRoute from "@/components/RoleRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                <Route path="/" element={<Index />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/reconcile" element={<Reconcile />} />
                <Route path="/review" element={<Review />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:runId" element={<SessionReport />} />
                <Route path="/exceptions" element={<Exceptions />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/audit" element={<Audit />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={['CUSTOMER']} />}>
                <Route path="/customer/dashboard" element={<CustomerDashboard />} />
                <Route path="/customer/invoices" element={<CustomerInvoices />} />
              </Route>
              {/* Settings can be accessed by both ADMIN and CUSTOMER */}
              <Route element={<RoleRoute allowedRoles={['ADMIN', 'CUSTOMER']} />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
