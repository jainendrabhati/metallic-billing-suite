from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from models import db, Customer, Bill, Transaction, Expense, Employee, EmployeePayment, Stock, StockItem
from utils import export_to_csv, export_to_pdf, backup_database, restore_database

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///metalic.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

# Enable CORS for frontend communication
CORS(app)

# Initialize database
db.init_app(app)

# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.before_first_request
def create_tables():
    db.create_all()

# Customer APIs
@app.route('/api/customers', methods=['GET'])
def get_customers():
    customers = Customer.get_all()
    return jsonify([customer.to_dict() for customer in customers])

@app.route('/api/customers', methods=['POST'])
def create_customer():
    data = request.json
    customer = Customer.create(
        name=data['name'],
        mobile=data['mobile'],
        address=data['address']
    )
    return jsonify(customer.to_dict()), 201

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    customer = Customer.get_by_id(customer_id)
    if customer:
        return jsonify(customer.to_dict())
    return jsonify({'error': 'Customer not found'}), 404

@app.route('/api/customers/search', methods=['GET'])
def search_customers():
    query = request.args.get('q', '')
    customers = Customer.search_by_name(query)
    return jsonify([customer.to_dict() for customer in customers])

# Pending List API
@app.route('/api/customers/pending', methods=['GET'])
def get_pending_customers():
    customers = Customer.get_pending_customers()
    return jsonify([customer for customer in customers])

@app.route('/api/customers/<int:customer_id>/bills', methods=['GET'])
def get_customer_bills(customer_id):
    bills = Bill.get_by_customer(customer_id)
    return jsonify([bill.to_dict() for bill in bills])

# Bill APIs
@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = Bill.get_all()
    return jsonify([bill.to_dict() for bill in bills])

@app.route('/api/bills', methods=['POST'])
def create_bill():
    data = request.json
    
    # Calculate totals
    weight = float(data['weight'])
    tunch = float(data['tunch'])
    wastage = float(data['wastage'])
    wages = float(data['wages'])
    silver_amount = float(data.get('silver_amount', 0))
    
    total_fine = weight * ((tunch - wastage) / 100)
    total_amount = (weight * (wages / 1000)) + silver_amount
    
    bill = Bill.create(
        customer_id=data['customer_id'],
        item=data['item'],
        weight=weight,
        tunch=tunch,
        wages=wages,
        wastage=wastage,
        silver_amount=silver_amount,
        total_fine=total_fine,
        total_amount=total_amount,
        payment_type=data['payment_type'],
        slip_no=data.get('slip_no', ''),
        description=data.get('description', ''),
        gst_number=data.get('gst_number', ''),
        date=datetime.strptime(data['date'], '%Y-%m-%d').date()
    )
    
    # Update stock based on payment type and item type
    if data['payment_type'] == 'credit':
        Stock.add_stock(data['item'], total_fine, f"Credit bill #{bill.id} - {data['item']}")
    else:  # debit
        Stock.deduct_stock(data['item'], total_fine, f"Debit bill #{bill.id} - {data['item']}")
    
    # Create transaction
    Transaction.create(
        bill_id=bill.id,
        customer_id=data['customer_id'],
        amount=total_amount,
        transaction_type=data['payment_type'],
        status='completed',
        description=f"Bill #{bill.id} - {data['item']}"
    )
    
    return jsonify(bill.to_dict()), 201

# Transaction APIs
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    return jsonify([transaction.to_dict() for transaction in transactions])

@app.route('/api/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction_details(transaction_id):
    transaction = Transaction.get_by_id(transaction_id)
    if transaction:
        return jsonify(transaction.to_dict())
    return jsonify({'error': 'Transaction not found'}), 404

@app.route('/api/transactions/export/csv', methods=['GET'])
def export_transactions_csv():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    filename = export_to_csv(transactions, 'transactions')
    
    return jsonify({'filename': filename, 'message': 'Export successful'})

@app.route('/api/transactions/export/pdf', methods=['GET'])
def export_transactions_pdf():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    filename = export_to_pdf(transactions, 'transactions')
    
    return jsonify({'filename': filename, 'message': 'Export successful'})

# Employee APIs
@app.route('/api/employees', methods=['GET'])
def get_employees():
    employees = Employee.get_all()
    return jsonify([employee.to_dict() for employee in employees])

@app.route('/api/employees', methods=['POST'])
def create_employee():
    data = request.json
    employee = Employee.create(
        name=data['name'],
        position=data['position'],
        monthly_salary=float(data['monthly_salary']),
        present_days=int(data['present_days']),
        total_days=int(data['total_days'])
    )
    return jsonify(employee.to_dict()), 201

@app.route('/api/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    data = request.json
    employee = Employee.update(employee_id, data)
    if employee:
        return jsonify(employee.to_dict())
    return jsonify({'error': 'Employee not found'}), 404

@app.route('/api/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    employee = Employee.get_by_id(employee_id)
    if employee:
        return jsonify(employee.to_dict())
    return jsonify({'error': 'Employee not found'}), 404

# Employee Payment APIs
@app.route('/api/employee-payments', methods=['GET'])
def get_employee_payments():
    payments = EmployeePayment.get_all()
    return jsonify([payment.to_dict() for payment in payments])

@app.route('/api/employee-payments/employee/<int:employee_id>', methods=['GET'])
def get_employee_payments_by_employee(employee_id):
    payments = EmployeePayment.get_by_employee_id(employee_id)
    return jsonify([payment.to_dict() for payment in payments])

@app.route('/api/employee-payments', methods=['POST'])
def create_employee_payment():
    data = request.json
    payment = EmployeePayment.create(
        employee_id=data['employee_id'],
        amount=float(data['amount']),
        payment_date=datetime.strptime(data['payment_date'], '%Y-%m-%d').date(),
        description=data.get('description', '')
    )
    
    # Create expense entry for employee payment
    Expense.create(
        description=f"Salary payment to {payment.employee.name}",
        amount=payment.amount,
        category='Employee Salary',
        status='paid',
        date=payment.payment_date
    )
    
    return jsonify(payment.to_dict()), 201

# Enhanced Expense APIs with calculations
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    expenses = Expense.get_all()
    return jsonify([expense.to_dict() for expense in expenses])

@app.route('/api/expenses/dashboard', methods=['GET'])
def get_expense_dashboard():
    all_bills = Bill.get_all()
    all_expenses = Expense.get_all()
    
    # Calculate total expenses
    total_expenses = sum(expense.amount for expense in all_expenses)
    
    # Calculate credit bills total fine
    credit_bills = [bill for bill in all_bills if bill.payment_type == 'credit']
    total_credit_fine = sum(bill.total_fine for bill in credit_bills)
    
    # Calculate debit bills weight * tunch
    debit_bills = [bill for bill in all_bills if bill.payment_type == 'debit']
    total_debit_weight_tunch = sum(bill.weight * bill.tunch for bill in debit_bills)
    
    # Net fine (credit fine - debit weight*tunch)
    net_fine = total_credit_fine - total_debit_weight_tunch
    
    # Total amount of all bills
    total_bill_amount = sum(bill.total_amount for bill in all_bills)
    
    # Total silver amount
    total_silver_amount = sum(bill.silver_amount for bill in all_bills)
    
    # Total wages * weight
    total_wages_weight = sum(bill.wages * bill.weight for bill in all_bills)
    
    return jsonify({
        'total_expenses': total_expenses,
        'net_fine': net_fine,
        'total_bill_amount': total_bill_amount,
        'total_silver_amount': total_silver_amount,
        'total_wages_weight': total_wages_weight,
        'balance_sheet': {
            'silver_balance': net_fine,
            'rupee_balance': total_bill_amount - total_expenses
        }
    })

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    data = request.json
    expense = Expense.create(
        description=data['description'],
        amount=float(data['amount']),
        category=data['category'],
        status=data['status'],
        date=datetime.strptime(data['date'], '%Y-%m-%d').date()
    )
    return jsonify(expense.to_dict()), 201

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.json
    expense = Expense.update(expense_id, data)
    if expense:
        return jsonify(expense.to_dict())
    return jsonify({'error': 'Expense not found'}), 404

# Stock Item APIs
@app.route('/api/stock-items', methods=['GET'])
def get_stock_items():
    items = StockItem.get_all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/stock-items', methods=['POST'])
def create_stock_item():
    data = request.json
    item = StockItem.create(
        item_name=data['item_name'],
        current_weight=float(data.get('current_weight', 0)),
        description=data.get('description', '')
    )
    return jsonify(item.to_dict()), 201

@app.route('/api/stock-items/<int:item_id>', methods=['PUT'])
def update_stock_item(item_id):
    data = request.json
    item = StockItem.get_by_id(item_id)
    if item:
        item.item_name = data.get('item_name', item.item_name)
        item.current_weight = float(data.get('current_weight', item.current_weight))
        item.description = data.get('description', item.description)
        item.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(item.to_dict())
    return jsonify({'error': 'Stock item not found'}), 404

@app.route('/api/stock-items/<int:item_id>', methods=['DELETE'])
def delete_stock_item(item_id):
    item = StockItem.get_by_id(item_id)
    if item:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Stock item deleted successfully'})
    return jsonify({'error': 'Stock item not found'}), 404

# Stock APIs
@app.route('/api/stock', methods=['GET'])
def get_stock():
    stock = Stock.get_current_stock()
    return jsonify({'current_stock': stock})

@app.route('/api/stock/transaction', methods=['POST'])
def add_stock_transaction():
    data = request.json
    amount = float(data['amount'])
    transaction_type = data['transaction_type']
    item_name = data.get('item_name', 'General')
    description = data.get('description', f'Manual {transaction_type}')
    
    if transaction_type == 'add':
        Stock.add_stock(item_name, amount, description)
    else:
        Stock.deduct_stock(item_name, amount, description)
    
    return jsonify({'message': 'Stock transaction completed successfully', 'new_stock': Stock.get_current_stock()})

@app.route('/api/stock/history', methods=['GET'])
def get_stock_history():
    history = Stock.get_all()
    return jsonify([stock.to_dict() for stock in history])

# Settings APIs
@app.route('/api/settings/backup', methods=['GET'])
def download_backup():
    filename = backup_database()
    return jsonify({'filename': filename, 'message': 'Backup created successfully'})

@app.route('/api/settings/restore', methods=['POST'])
def upload_backup():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        restore_database(file)
        return jsonify({'message': 'Database restored successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/firm', methods=['GET'])
def get_firm_settings():
    return jsonify({
        'firm_name': 'Metalic Jewelers',
        'gst_number': '24ABCDE1234F1Z5',
        'address': '123 Business Street, City, State - 400001',
        'logo_path': None
    })

@app.route('/api/settings/firm', methods=['POST'])
def update_firm_settings():
    data = request.json
    return jsonify({'message': 'Settings updated successfully'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
