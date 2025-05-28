
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import BillingPage from "./pages/BillingPage";
import CustomersPage from "./pages/CustomersPage";
import TransactionsPage from "./pages/TransactionsPage";
import ExpensesPage from "./pages/ExpensesPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-gray-50">
            <AppSidebar />
            <main className="flex-1 p-4">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
