
# Metalic Billing Backend

Flask backend with SQLite3 database for the Metalic billing application.

## Setup Instructions

1. Install Python 3.8 or higher
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the application:
   ```bash
   python run.py
   ```

The server will start on `http://127.0.0.1:5000`

## API Endpoints

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/<id>` - Get customer by ID
- `GET /api/customers/search?q=<name>` - Search customers by name

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create new bill
- `GET /api/bills/<id>` - Get bill by ID

### Transactions
- `GET /api/transactions` - Get all transactions (with filters)
- `GET /api/transactions/export/csv` - Export transactions to CSV
- `GET /api/transactions/export/pdf` - Export transactions to PDF

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/<id>` - Update expense

### Settings
- `GET /api/settings/backup` - Download database backup
- `POST /api/settings/restore` - Upload and restore database
- `GET /api/settings/firm` - Get firm settings
- `POST /api/settings/firm` - Update firm settings

## Database Models

- **Customer**: Stores customer information
- **Bill**: Stores billing information with automatic calculations
- **Transaction**: Tracks all financial transactions
- **Expense**: Manages business expenses
- **BillItem**: Stores individual items in bills (for future use)

## Features

- Automatic calculation of Total Fine and Total Amount
- Customer search and autocomplete
- Export data to CSV/PDF formats
- Database backup and restore functionality
- SQLite database for offline operation
