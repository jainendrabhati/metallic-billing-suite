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
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/SidebarProvider";
import LicenseAuthDialog from "@/components/LicenseAuthDialog";
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
import { useLicenseAuth } from "@/hooks/useLicenseAuth";

const queryClient = new QueryClient()
import PendingListPage from "@/pages/PendingListPage";
import StockPage from "@/pages/StockPage";

function AppContent() {
  const { isAuthenticated, isLoading, showAuthDialog, handleAuthSuccess } = useLicenseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">License Authentication Required</h1>
            <p className="text-gray-600">Please authenticate your license to continue.</p>
          </div>
        </div>
        <LicenseAuthDialog 
          open={showAuthDialog} 
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <Navbar />
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
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
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
