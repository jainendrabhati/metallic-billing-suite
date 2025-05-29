
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Toaster } from '@/components/ui/toaster'
import Dashboard from '@/pages/Dashboard'
import BillingPage from '@/pages/BillingPage'
import CustomersPage from '@/pages/CustomersPage'
import TransactionsPage from '@/pages/TransactionsPage'
import EmployeesPage from '@/pages/EmployeesPage'
import ExpensesPage from '@/pages/ExpensesPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFound from '@/pages/NotFound'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-gray-50">
            <AppSidebar />
            <SidebarInset className="flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SidebarInset>
          </div>
          <Toaster />
        </SidebarProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
