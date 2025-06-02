
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import BillingPage from "@/pages/BillingPage";
import CustomersPage from "@/pages/CustomersPage";
import TransactionsPage from "@/pages/TransactionsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/SidebarProvider";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster"
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient()
import PendingListPage from "@/pages/PendingListPage";
import StockPage from "@/pages/StockPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/pending-list" element={<PendingListPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
