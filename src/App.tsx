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
import GSTBillPage from "./pages/GSTBillPage";
// import GSTBillLogsPage from "./pages/GSTBillLogsPage";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/SidebarProvider";
import LicenseAuthDialog from "@/components/LicenseAuthDialog";
import { licenseScheduler } from "@/services/licenseScheduler";

import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { useLicenseAuth } from "@/hooks/useLicenseAuth";
import PendingListPage from "@/pages/PendingListPage";
import StockPage from "@/pages/StockPage";

const queryClient = new QueryClient();

// Use HashRouter in production (Electron), BrowserRouter in development
const Router =
  process.env.NODE_ENV === "production" ? HashRouter : BrowserRouter;

function AppContent() {
  const {
    isAuthenticated,
    isLoading,
    showAuthDialog,
    handleAuthSuccess,
    isServerReady,
    serverCheckAttempts,
  } = useLicenseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {!isServerReady ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Starting Application Server</h2>
              <p className="text-muted-foreground">
                Please wait while the server starts up...
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <span>Attempt {serverCheckAttempts + 1} of 10</span>
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Checking License</h2>
              <p className="text-muted-foreground">
                Verifying your activation key...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please Wait License is in verification</h1>
            <p className="text-gray-600">Silvertally Server starting................</p>
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
        {/* <Navbar /> */}
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/gst-bill" element={<GSTBillPage />} />
              
              {/* <Route path="/gst-bill-logs" element={<GSTBillLogsPage />} /> */}
             
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/pending-list" element={<PendingListPage />} />
              
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
