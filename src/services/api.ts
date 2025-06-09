import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  address: string;
  total_bills: number;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name: string;
  item_name: string;
  item: string;
  weight: number;
  tunch: number;
  wages: number;
  wastage: number;
  silver_amount: number;
  total_fine: number;
  total_amount: number;
  total_wages: number;
  payment_type: string;
  slip_no: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  bill_id: number | null;
  bill_number: string | null;
  customer_id: number;
  customer_name: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
  updated_at: string;
  weight?: number;
  tunch?: number;
  wages?: number;
  wastage?: number;
  silver_amount?: number;
  total_wages?: number;
  item?: string;
  item_name?: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  status: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  item_name: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export interface StockItem {
  id: number;
  item_name: string;
  current_weight: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface FirmSettings {
  id: number;
  firm_name: string;
  gst_number: string;
  address: string;
  logo_path: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  name: string;
  position: string;
  monthly_salary: number;
  present_days: number;
  total_days: number;
  calculated_salary: number;
  paid_amount: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayment {
  id: number;
  employee_id: number;
  employee_name: string;
  amount: number;
  payment_date: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSalary {
  id: number;
  employee_id: number;
  employee_name: string;
  month: string;
  year: number;
  monthly_salary: number;
  present_days: number;
  total_days: number;
  calculated_salary: number;
  created_at: string;
  updated_at: string;
}

export const customerAPI = {
  getAll: () => api.get('/customers').then(res => res.data),
  getById: (id: number) => api.get(`/customers/${id}`).then(res => res.data),
  create: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'total_bills'>) =>
    api.post('/customers', customer).then(res => res.data),
  update: (id: number, customer: Partial<Customer>) =>
    api.put(`/customers/${id}`, customer).then(res => res.data),
  delete: (id: number) => api.delete(`/customers/${id}`).then(res => res.data),
  search: (name: string) => api.get(`/customers/search?name=${name}`).then(res => res.data),
  getPending: () => api.get('/customers/pending').then(res => res.data)
};

export const billAPI = {
  getAll: () => api.get('/bills').then(res => res.data),
  getById: (id: number) => api.get(`/bills/${id}`).then(res => res.data),
  getByCustomer: (customerId: number) => api.get(`/bills/customer/${customerId}`).then(res => res.data),
  create: (bill: Omit<Bill, 'id' | 'bill_number' | 'customer_name' | 'total_fine' | 'total_amount' | 'total_wages' | 'created_at' | 'updated_at'>) =>
    api.post('/bills', bill).then(res => res.data),
  update: (id: number, bill: Partial<Bill>) =>
    api.put(`/bills/${id}`, bill).then(res => res.data),
  delete: (id: number) => api.delete(`/bills/${id}`).then(res => res.data)
};

export const transactionAPI = {
  getAll: () => api.get('/transactions').then(res => res.data),
  getById: (id: number) => api.get(`/transactions/${id}`).then(res => res.data),
  create: (transaction: Omit<Transaction, 'id' | 'customer_name' | 'created_at' | 'updated_at' | 'weight' | 'tunch' | 'wages' | 'wastage' | 'silver_amount' | 'total_wages' | 'item' | 'item_name'>) =>
    api.post('/transactions', transaction).then(res => res.data),
  update: (id: number, transaction: Partial<Transaction>) =>
    api.put(`/transactions/${id}`, transaction).then(res => res.data),
  delete: (id: number) => api.delete(`/transactions/${id}`).then(res => res.data),
  getFiltered: (startDate: string | null, endDate: string | null, customerName: string | null) => {
    let url = `/transactions/filtered?`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}&`;
    if (customerName) url += `customer_name=${customerName}&`;
    return api.get(url.slice(0, -1)).then(res => res.data);
  }
};

export const expenseAPI = {
  getAll: () => api.get('/expenses').then(res => res.data),
  getById: (id: number) => api.get(`/expenses/${id}`).then(res => res.data),
  create: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) =>
    api.post('/expenses', expense).then(res => res.data),
  update: (id: number, expense: Partial<Expense>) =>
    api.put(`/expenses/${id}`, expense).then(res => res.data),
  delete: (id: number) => api.delete(`/expenses/${id}`).then(res => res.data)
};

export const settingsAPI = {
  getSettings: () => api.get('/settings').then(res => res.data),
  updateSettings: (settings: Partial<FirmSettings>) => api.put('/settings', settings).then(res => res.data),
};

export const stockAPI = {
  getAll: () => api.get('/stock').then(res => res.data),
  addStock: (data: any) => api.post('/stock/add', data).then(res => res.data),
  deductStock: (data: any) => api.post('/stock/deduct', data).then(res => res.data),
  getCurrentStock: () => api.get('/stock/current').then(res => res.data)
};

export const employeeAPI = {
  getAll: () => api.get('/employees').then(res => res.data),
  getById: (id: number) => api.get(`/employees/${id}`).then(res => res.data),
  create: (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'calculated_salary' | 'remaining_amount'>) => 
    api.post('/employees', employee).then(res => res.data),
  update: (id: number, employee: Partial<Employee>) => 
    api.put(`/employees/${id}`, employee).then(res => res.data),
  delete: (id: number) => api.delete(`/employees/${id}`).then(res => res.data)
};

export const employeePaymentAPI = {
  getAll: () => api.get('/employee-payments').then(res => res.data),
  getByEmployeeId: (employeeId: number) => api.get(`/employee-payments/employee/${employeeId}`).then(res => res.data),
  create: (payment: Omit<EmployeePayment, 'id' | 'employee_name' | 'created_at' | 'updated_at'>) => 
    api.post('/employee-payments', payment).then(res => res.data),
  delete: (id: number) => api.delete(`/employee-payments/${id}`).then(res => res.data)
};

export const employeeSalaryAPI = {
  getAll: () => api.get('/employee-salaries').then(res => res.data),
  getByEmployeeId: (employeeId: number) => api.get(`/employee-salaries/employee/${employeeId}`).then(res => res.data),
  create: (salary: Omit<EmployeeSalary, 'id' | 'employee_name' | 'calculated_salary' | 'created_at' | 'updated_at'>) => 
    api.post('/employee-salaries', salary).then(res => res.data),
  update: (id: number, salary: Partial<EmployeeSalary>) => 
    api.put(`/employee-salaries/${id}`, salary).then(res => res.data),
  delete: (id: number) => api.delete(`/employee-salaries/${id}`).then(res => res.data)
};
