from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, date
import os
from models import db, Customer, Bill, Transaction, Employee, EmployeePayment, StockItem, Stock, Expense, FirmSettings
from flask import send_from_directory
from utils import backup_database, restore_database

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///./database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'zip'}

# Ensure the uploads folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db.init_app(app)

with app.app_context():
    db.create_all()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def home():
    return "Hello, Flask!"

# Static file serving for images
@app.route('/uploads/<filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Customer routes
@app.route('/api/customers', methods=['GET'])
def get_customers():
    customers = Customer.get_all()
    return jsonify([customer.to_dict() for customer in customers])

@app.route('/api/customers', methods=['POST'])
def create_customer():
    data = request.get_json()
    customer = Customer.create(name=data['name'], mobile=data['mobile'], address=data['address'])
    return jsonify(customer.to_dict()), 201

@app.route('/api/customers/search', methods=['GET'])
def search_customers():
    query = request.args.get('q')
    customers = Customer.search_by_name(query)
    return jsonify([customer.to_dict() for customer in customers])

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    customer = Customer.get_by_id(customer_id)
    if customer:
        return jsonify(customer.to_dict())
    return jsonify({'message': 'Customer not found'}), 404

@app.route('/api/customers/<int:customer_id>/bills', methods=['GET'])
def get_customer_bills(customer_id):
    bills = Bill.get_by_customer(customer_id)
    return jsonify([bill.to_dict() for bill in bills])

@app.route('/api/customers/pending', methods=['GET'])
def get_pending_customers():
    pending_customers = Customer.get_pending_customers()
    return jsonify(pending_customers)

# Bills routes
@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = Bill.get_all()
    return jsonify([bill.to_dict() for bill in bills])

@app.route('/api/bills', methods=['POST'])
def create_bill():
    data = request.get_json()
    
    # Calculate total fine and total amount
    weight = data['weight']
    tunch = data['tunch']
    wastage = data['wastage']
    wages = data['wages']
    silver_amount = data.get('silver_amount', 0)
    
    total_fine = weight * ((tunch - wastage) / 100)
    total_amount = (weight * (wages / 1000)) + (silver_amount if data['payment_type'] == 'credit' else 0)
    
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
        date=data['date']
    )
    
    # Create transaction
    Transaction.create(
        bill_id=bill.id,
        customer_id=bill.customer_id,
        amount=bill.total_amount,
        transaction_type=bill.payment_type,
        description=f"Bill #{bill.bill_number} - {bill.item}"
    )
    
    # Update stock based on payment type
    if bill.payment_type == 'credit':
        Stock.add_stock(bill.item, bill.total_fine, f"Stock added from credit bill #{bill.bill_number}")
    else:
        Stock.deduct_stock(bill.item, bill.total_fine, f"Stock deducted from debit bill #{bill.bill_number}")
    
    return jsonify(bill.to_dict()), 201

@app.route('/api/bills/<int:bill_id>', methods=['GET'])
def get_bill(bill_id):
    bill = Bill.get_by_id(bill_id)
    if bill:
        return jsonify(bill.to_dict())
    return jsonify({'message': 'Bill not found'}), 404

# Stock routes
@app.route('/api/stock', methods=['GET'])
def get_current_stock():
    current_stock = Stock.get_current_stock()
    return jsonify({'current_stock': current_stock})

@app.route('/api/stock/transaction', methods=['POST'])
def add_stock_transaction():
    data = request.get_json()
    item_name = data['item_name']
    amount = data['amount']
    transaction_type = data['transaction_type']
    description = data['description']
    
    if transaction_type == 'add':
        Stock.add_stock(item_name, amount, description)
    else:
        Stock.deduct_stock(item_name, amount, description)
    
    new_stock = Stock.get_current_stock()
    return jsonify({'message': 'Stock transaction added successfully', 'new_stock': new_stock})

@app.route('/api/stock/history', methods=['GET'])
def get_stock_history():
    stock_history = Stock.get_all()
    return jsonify([stock.to_dict() for stock in stock_history])

# Stock Item routes
@app.route('/api/stock-items', methods=['GET'])
def get_stock_items():
    stock_items = StockItem.get_all()
    return jsonify([item.to_dict() for item in stock_items])

@app.route('/api/stock-items', methods=['POST'])
def create_stock_item():
    data = request.get_json()
    item = StockItem.create(item_name=data['item_name'], current_weight=data.get('current_weight', 0.0), description=data.get('description', ''))
    return jsonify(item.to_dict()), 201

@app.route('/api/stock-items/<int:item_id>', methods=['PUT'])
def update_stock_item(item_id):
    data = request.get_json()
    item = StockItem.get_by_id(item_id)
    if not item:
        return jsonify({'message': 'Stock item not found'}), 404
    
    for key, value in data.items():
        if hasattr(item, key):
            setattr(item, key, value)
    
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/stock-items/<int:item_id>', methods=['DELETE'])
def delete_stock_item(item_id):
    item = StockItem.get_by_id(item_id)
    if not item:
        return jsonify({'message': 'Stock item not found'}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Stock item deleted successfully'})

# Transaction routes
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    return jsonify([transaction.to_dict() for transaction in transactions])

@app.route('/api/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    transaction = Transaction.get_by_id(transaction_id)
    if transaction:
        return jsonify(transaction.to_dict())
    return jsonify({'message': 'Transaction not found'}), 404

# Expense routes
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    expenses = Expense.get_all()
    return jsonify([expense.to_dict() for expense in expenses])

@app.route('/api/expenses/dashboard', methods=['GET'])
def get_expenses_dashboard():
    total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
    net_fine = db.session.query(db.func.sum(Bill.total_fine)).scalar() or 0
    total_bill_amount = db.session.query(db.func.sum(Bill.total_amount)).scalar() or 0
    total_silver_amount = db.session.query(db.func.sum(Bill.silver_amount)).scalar() or 0
    total_wages_weight = db.session.query(db.func.sum(Bill.wages * Bill.weight)).scalar() or 0

    # Calculate silver and rupee balance (example logic)
    silver_balance = Stock.get_current_stock()
    rupee_balance = total_bill_amount - total_expenses

    dashboard_data = {
        'total_expenses': total_expenses,
        'net_fine': net_fine,
        'total_bill_amount': total_bill_amount,
        'total_silver_amount': total_silver_amount,
        'total_wages_weight': total_wages_weight,
        'balance_sheet': {
            'silver_balance': silver_balance,
            'rupee_balance': rupee_balance
        }
    }
    return jsonify(dashboard_data)

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    data = request.get_json()
    expense = Expense.create(
        description=data['description'],
        amount=data['amount'],
        category=data['category'],
        status=data.get('status', 'pending'),
        date=data['date']
    )
    return jsonify(expense.to_dict()), 201

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.get_json()
    expense = Expense.get_by_id(expense_id)
    if not expense:
        return jsonify({'message': 'Expense not found'}), 404
    
    for key, value in data.items():
        if hasattr(expense, key):
            setattr(expense, key, value)
    
    db.session.commit()
    return jsonify(expense.to_dict())

# Employee routes
@app.route('/api/employees', methods=['GET'])
def get_employees():
    employees = Employee.get_all()
    return jsonify([employee.to_dict() for employee in employees])

@app.route('/api/employees', methods=['POST'])
def create_employee():
    data = request.get_json()
    employee = Employee.create(
        name=data['name'],
        position=data['position'],
        monthly_salary=data['monthly_salary'],
        present_days=data['present_days'],
        total_days=data['total_days']
    )
    return jsonify(employee.to_dict()), 201

@app.route('/api/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    employee = Employee.get_by_id(employee_id)
    if employee:
        return jsonify(employee.to_dict())
    return jsonify({'message': 'Employee not found'}), 404

@app.route('/api/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    data = request.get_json()
    employee = Employee.update(employee_id, data)
    if employee:
        return jsonify(employee.to_dict())
    return jsonify({'message': 'Employee not found'}), 404

# Employee Payment routes
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
    data = request.get_json()
    payment = EmployeePayment.create(
        employee_id=data['employee_id'],
        amount=data['amount'],
        payment_date=data['payment_date'],
        description=data.get('description', '')
    )
    return jsonify(payment.to_dict()), 201

# Settings routes
@app.route('/api/settings/backup', methods=['GET'])
def download_backup():
    try:
        zip_filename = backup_database()
        zip_filepath = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
        return send_file(zip_filepath, as_attachment=True, download_name=zip_filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/restore', methods=['POST'])
def upload_backup():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and file.filename.endswith('.zip'):
            restore_database(file)
            return jsonify({'message': 'Database restored successfully'})
        else:
            return jsonify({'error': 'Invalid file format. Please upload a ZIP file.'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/firm', methods=['GET'])
def get_firm_settings():
    settings = FirmSettings.get_settings()
    return jsonify(settings.to_dict())

@app.route('/api/settings/firm', methods=['POST'])
def update_firm_settings():
    data = request.get_json()
    settings = FirmSettings.update_settings(data)
    return jsonify(settings.to_dict())

if __name__ == '__main__':
    app.run(debug=True)
